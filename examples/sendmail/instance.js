import mailgun from 'apis/mailgun.yaml';
import { v4 as uuid } from 'uuid';

export const csv: table = {};

export function csvGET(_) {
  return Object.keys(csv);
}

export function csvIdDELETE(req) {
  const id = req.path.id;
  if (csv[id] === undefined) {
    throw new Error(`[404] ${id} not found.`);
  }
  delete csv[id];
  return `${id} deleted`;
}

export function csvIdGET(req) {
  const id = req.path.id;
  if (csv[id] === undefined) {
    throw new Error(`[404] ${id} not found.`);
  }
  return csv[id];
}

export function csvPOST(req) {
  let id = uuid();
  csv[id] = req.body.csv;
  for (const record of csv[id].toString().split(/\r\n|\r|\n/)) {
    const fields = record.split(',');
    if (fields[1] === undefined) continue;
    mailgun.domain['example.com'].messages({
      from: 'hello@example.com',
      to: fields[1],
      subject: 'Test',
      text: 'This is a test.',
    });
  }
  return { id };
}
