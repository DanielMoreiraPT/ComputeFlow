AmberFF:
  name: AmberFF
  type: component
  config:
  -  name: bonds
    checked: true
    type: checkbox
    help: include bond information
  -  name: angles
    checked: true
    type: checkbox
    help: include angle information
  -  name: proper
    checked: true
    type: checkbox
    help: include proper information
  -  name: improper
    checked: true
    type: checkbox
    help: include improper information
  ports:
    input: []
    output:
    -  name: AmberFF
      type: Evaluator
      category: component
      cardinality: {max: 999, min: 0}