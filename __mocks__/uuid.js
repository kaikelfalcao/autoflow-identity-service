let n = 0;
exports.v4 = () => {
  n += 1;
  const hex = n.toString(16).padStart(12, '0');
  return `00000000-0000-0000-0000-${hex}`;
};
