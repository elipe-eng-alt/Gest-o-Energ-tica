import { defineRailway, github, project, service, volume } from "railway/iac";

// Este repositório gerencia apenas os recursos que declara aqui.
// Variáveis (ADMIN_TOKEN, SMTP_*, ...) ficam no painel do Railway: IaC não lê nem altera.
export const partial = "Gest-o-Energ-tica";

export default defineRailway(() => {
  // Volume com o banco SQLite (cadastros). Remover daqui apaga os dados.
  const dataVolume = volume("gest-o-energ-tica-volume", {
    alerts: { usage: { "80": {}, "95": {}, "100": {} } },
    allowOnlineResize: true,
    region: "iad",
    sizeMB: 500,
  });

  const app = service("Gest-o-Energ-tica", {
    source: github("elipe-eng-alt/Gest-o-Energ-tica", { branch: "main", checkSuites: false }),
    build: "npm run build",
    start: "npm start",
    healthcheck: "/api/health",
    replicas: { iad: 1 },
    networking: { privateNetworkEndpoint: "gest-o-energ-tica" },
    volumeMounts: { "/data": dataVolume },
  });

  return project("cozy-bravery", {
    variables: { managed: false },
    resources: [app, dataVolume],
  });
});
