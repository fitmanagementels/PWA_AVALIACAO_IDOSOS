import { HttpError, corsHeaders, jsonResponse, readJsonBody } from './http.js';
import { requireAuthorizedUser } from './auth.js';
import * as repository from './repository.js';
import { validateAssessmentInput, validateCompletion, validatePersonInput } from './validation.js';

function apiResponse(request, env, data, user) {
  return jsonResponse(request, env, 200, {
    ok: true,
    data,
    meta: { updatedAt: new Date().toISOString(), user },
  });
}

function service(services, name) {
  if (!services[name]) throw new HttpError(501, 'NOT_IMPLEMENTED', 'Esta operação ainda não está disponível.');
  return services[name];
}

function nowIso(dependencies) {
  return typeof dependencies.now === 'string' ? dependencies.now : new Date().toISOString();
}

function routeId(match) {
  return decodeURIComponent(match[1]);
}

export function createWorker(dependencies = {}) {
  return {
    async fetch(request, env) {
      try {
        const cors = corsHeaders(request, env);

        if (request.method === 'OPTIONS') {
          return new Response(null, { status: 204, headers: cors });
        }

        const url = new URL(request.url);

        if (url.pathname === '/health') {
          return jsonResponse(request, env, 200, { ok: true, data: { status: 'ok' } });
        }

        if (!url.pathname.startsWith('/api/')) {
          throw new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.');
        }

        const user = await (dependencies.authenticate || requireAuthorizedUser)(request, env, dependencies);
        const services = { ...repository, ...dependencies };
        const now = nowIso(dependencies);

        if (request.method === 'GET' && url.pathname === '/api/people') {
          return apiResponse(request, env, await service(services, 'listPeople')(env.DB), user);
        }

        if (request.method === 'POST' && url.pathname === '/api/people') {
          const input = await readJsonBody(request);
          validatePersonInput(input);
          return apiResponse(request, env, await service(services, 'savePerson')(env.DB, input, now), user);
        }

        const personHistoryMatch = url.pathname.match(/^\/api\/people\/([^/]+)\/history$/);
        if (request.method === 'GET' && personHistoryMatch) {
          return apiResponse(request, env, await service(services, 'getPersonHistory')(env.DB, routeId(personHistoryMatch)), user);
        }

        const personFlowMatch = url.pathname.match(/^\/api\/people\/([^/]+)\/flow$/);
        if (request.method === 'GET' && personFlowMatch) {
          return apiResponse(request, env, await service(services, 'getPersonFlow')(env.DB, routeId(personFlowMatch)), user);
        }

        const personMatch = url.pathname.match(/^\/api\/people\/([^/]+)$/);
        if (request.method === 'GET' && personMatch) {
          return apiResponse(request, env, await service(services, 'getPerson')(env.DB, routeId(personMatch)), user);
        }

        if (request.method === 'GET' && url.pathname === '/api/catalog') {
          return apiResponse(request, env, await service(services, 'getCatalog')(env.DB), user);
        }

        if (request.method === 'GET' && url.pathname === '/api/assessments' && url.searchParams.get('status') === 'arquivada') {
          return apiResponse(request, env, await service(services, 'listArchivedDrafts')(env.DB), user);
        }

        if (request.method === 'POST' && url.pathname === '/api/assessments') {
          const input = await readJsonBody(request);
          validateAssessmentInput(input);
          return apiResponse(request, env, await service(services, 'createAssessment')(env.DB, input, now), user);
        }

        const completeMatch = url.pathname.match(/^\/api\/assessments\/([^/]+)\/complete$/);
        if (request.method === 'POST' && completeMatch) {
          const input = { ...await readJsonBody(request), id: routeId(completeMatch) };
          validateAssessmentInput(input);
          validateCompletion({ selectedTestIds: input.testIds, results: input.results });
          return apiResponse(request, env, await service(services, 'saveAssessment')(env.DB, input, { complete: true, now }), user);
        }

        const archiveMatch = url.pathname.match(/^\/api\/assessments\/([^/]+)\/archive$/);
        if (request.method === 'POST' && archiveMatch) {
          return apiResponse(request, env, await service(services, 'archiveAssessment')(env.DB, routeId(archiveMatch), now), user);
        }

        const assessmentTestMatch = url.pathname.match(/^\/api\/assessments\/([^/]+)\/tests\/([^/]+)$/);
        if (request.method === 'DELETE' && assessmentTestMatch) {
          const [, assessmentId, testId] = assessmentTestMatch;
          return apiResponse(request, env, await service(services, 'removeAssessmentTest')(env.DB, decodeURIComponent(assessmentId), decodeURIComponent(testId)), user);
        }

        const assessmentMatch = url.pathname.match(/^\/api\/assessments\/([^/]+)$/);
        if (assessmentMatch) {
          const assessmentId = routeId(assessmentMatch);
          if (request.method === 'GET') {
            return apiResponse(request, env, await service(services, 'getAssessment')(env.DB, assessmentId), user);
          }
          if (request.method === 'PUT') {
            const input = { ...await readJsonBody(request), id: assessmentId };
            validateAssessmentInput(input);
            return apiResponse(request, env, await service(services, 'saveAssessment')(env.DB, input, { complete: false, now }), user);
          }
          if (request.method === 'DELETE') {
            return apiResponse(request, env, await service(services, 'deleteArchivedAssessment')(env.DB, assessmentId), user);
          }
        }

        throw new HttpError(404, 'NOT_FOUND', 'Rota não encontrada.');
      } catch (error) {
        const knownError = error instanceof HttpError;
        const status = knownError ? error.status : 400;
        const code = knownError ? error.code : 'INVALID_REQUEST';
        const message = knownError ? error.message : 'A requisição é inválida.';

        return jsonResponse(request, env, status, {
          ok: false,
          error: { code, message },
        });
      }
    },
  };
}

export default createWorker();
