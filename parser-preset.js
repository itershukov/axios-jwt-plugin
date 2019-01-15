module.exports = {
  parserOpts: {
    headerPattern: /^(\w*) \[([A-Z]*-\d*)\] (\w*): (\w*)$/,
    headerCorrespondence: ['scope', 'ticket', 'type', 'subject']
  }
};
