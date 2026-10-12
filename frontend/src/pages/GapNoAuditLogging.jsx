import React from 'react';
import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-no-audit-logging/history","title":"No audit logging","description":"Prepare a professional advisory report for no audit logging using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapNoAuditLogging({ token } = {}) { return <AIWorkspace feature={feature} token={token} />; }
