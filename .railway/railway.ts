import { defineRailway, github, project, service } from "railway/iac";
// Railway's service settings, saved from the dashboard on 2026-11-04. Railway
// does not read this file on deploy: a change takes effect only once applied
// with `railway config plan` and then `railway config apply` (Node 22+, after
// `npm install --prefix .railway`). A setting changed in the dashboard instead
// shows up as a difference in the next plan.
//
// This repository manages only its own resources in the environment.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "trading_alert";
export default defineRailway(() => {
  const smaAlert = service("sma 200 tqqq trading_alert", {
    source: github("max4ever/trading_alert", { branch: "master", checkSuites: false }),
    // No builder set: Railway finds the Dockerfile at the root and builds it.
    build: { buildEnvironment: "V3" },
    replicas: { "europe-west4-drams3a": 1 },
    deploy: {
      // UTC: 22:01 is after the New York close in summer and winter.
      cronSchedule: "1 22 * * 1-5",
      limitOverride: { containers: { cpu: 8, memoryBytes: 8000000000 } },
      restartPolicyType: "NEVER",
    },
    networking: { privateNetworkEndpoint: "tradingalert" },
  });

  return project("sma 200 alert tqqq", {
    variables: { managed: false },
    resources: [smaAlert],
  });
});
