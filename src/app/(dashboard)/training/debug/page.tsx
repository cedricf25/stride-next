import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Card, PageContainer, BackLink } from "@/components/shared";

export const dynamic = "force-dynamic";

function readDebugFile(filename: string): unknown {
  const path = join(process.cwd(), filename);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export default function DebugPage() {
  const promptData = readDebugFile("debug-prompt.json") as {
    timestamp?: string;
    planId?: string;
    systemPrompt?: string;
    userPrompt?: string;
  } | null;

  const responseData = readDebugFile("debug-response.json") as {
    timestamp?: string;
    response?: string;
  } | null;

  const parsedResponse = responseData?.response
    ? JSON.parse(responseData.response)
    : null;

  return (
    <PageContainer>
      <BackLink href="/training" label="Retour aux plans" />

      <h1 className="mt-4 text-2xl font-bold">Debug - Prompts IA</h1>
      <p className="text-sm text-gray-500">
        Dernière mise à jour : {promptData?.timestamp ?? "Aucun log"}
      </p>

      <div className="mt-6 space-y-6">
        <Card>
          <h2 className="text-lg font-semibold text-orange-600">
            System Prompt
          </h2>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-4 text-xs">
            {promptData?.systemPrompt ?? "Pas de données"}
          </pre>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-blue-600">User Prompt</h2>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-4 text-xs">
            {promptData?.userPrompt ?? "Pas de données"}
          </pre>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-green-600">
            Réponse IA (parsée)
          </h2>
          {parsedResponse ? (
            <div className="mt-3 space-y-4">
              <div className="rounded bg-green-50 p-3">
                <p className="text-sm font-medium">
                  Changelog: {parsedResponse.changelog?.summary}
                </p>
                <p className="text-xs text-gray-600">
                  {parsedResponse.changelog?.details}
                </p>
              </div>

              {parsedResponse.sessionsToDelete?.length > 0 && (
                <div className="rounded bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-700">
                    Suppressions demandées :
                  </p>
                  <ul className="mt-1 text-xs">
                    {parsedResponse.sessionsToDelete.map(
                      (
                        del: { weekNumber: number; dayOfWeek: string; reason: string },
                        i: number
                      ) => (
                        <li key={i}>
                          S{del.weekNumber} {del.dayOfWeek}: {del.reason}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-sm font-medium">
                  Séances avec changeReason :
                </p>
                <div className="mt-2 space-y-2">
                  {parsedResponse.weeks?.flatMap(
                    (week: { weekNumber: number; sessions?: Array<{ dayOfWeek?: string; title?: string; changeReason?: string | null }> }) =>
                      week.sessions
                        ?.filter((s: { changeReason?: string | null }) => s.changeReason)
                        .map((s: { dayOfWeek?: string; title?: string; changeReason?: string | null }, i: number) => (
                          <div
                            key={`${week.weekNumber}-${i}`}
                            className="rounded bg-yellow-50 p-2 text-xs"
                          >
                            <span className="font-medium">
                              S{week.weekNumber} - {s.dayOfWeek}
                            </span>{" "}
                            : {s.title}
                            <p className="mt-1 text-orange-700">
                              → {s.changeReason}
                            </p>
                          </div>
                        ))
                  )}
                </div>
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Voir la réponse JSON complète
                </summary>
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-4 text-xs">
                  {JSON.stringify(parsedResponse, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Pas de données</p>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
