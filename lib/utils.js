
function parseMsgArgs(msg) {
  if (msg.indexOf('.') !== 0)
    return null;

  const index = msg.indexOf(' ');

  if (index === -1)
    return '';

  return msg.slice(index + 1);
}

module.exports = {
  parseMsgArgs
}
