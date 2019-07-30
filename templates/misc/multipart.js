function getBoundary(header) {
  for (const part of header.split(';')) {
    if (part.indexOf('boundary') >= 0) {
      return part.split('=')[1].trim();
    }
  }
  throw new Error(`boundary not found in header: ${header}`);
}

function parseMultipart(event) {
  if (event.binaryBody === undefined) {
    throw new Error(
      `event.binaryBody is undefined although contentType is 'multipart/form-data': ${event}`,
    );
  }
  if (event.formData === undefined) {
    event.formData = {};
  }
  const multipart = Buffer.from(event.binaryBody.toString(), 'base64').toString();
  console.log(`multipart: ${multipart}`);
  const boundary = getBoundary(event.header['content-type']);
  for (const part of multipart.split(boundary).filter(str => !str.startsWith('--'))) {
    console.log(`part: ${part}`);
    const partLines = part.split(/\r\n/);
    console.log(JSON.stringify(partLines));
    let name;
    for (const item of partLines[1].split(';')) {
      const tuple = item.split('=');
      if (tuple.length === 2 && tuple[0].trim() === 'name') {
        name = tuple[1].trim().replace(/"|\[\]/g, '');
        break;
      }
    }
    let value = '';
    for (let i = 4; i <= partLines.length - 2; i += 1) {
      if (partLines[i] !== '--') {
        value = `${value}${partLines[i]}`;
      }
      if (i < partLines.length - 2) {
        value = `${value}\r\n`;
      }
    }
    console.log(`name: ${name}, value: ${value}`);
    if (event.formData[name] === undefined) {
      event.formData[name] = value;
    } else if (Array.isArray(event.formData[name])) {
      event.formData[name] = [...event.formData[name], value];
    } else {
      event.formData[name] = [event.formData[name], value];
    }
  }
  console.log(`event: ${JSON.stringify(event)}`);
  return event;
}
