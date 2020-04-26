PassThrough:
  name: PassThrough
  type: module
  ports:
    input:
    -  name: string
      type: String
      category: channel
      cardinality: {max: 999, min: 1}
    output:
    -  name: string
      type: String
      category: channel
      cardinality: {max: 999, min: 0}
# =============================================================================
Consumer:
  name: Consumer
  type: module
  ports:
    input:
    -  name: molecule
      type: Molecule
      category: channel
      cardinality: {max: 999, min: 1}
    -  name: state
      type: State
      category: channel
      cardinality: {max: 999, min: 1}
    output:
    -  name: molecule
      type: Molecule
      category: channel
      cardinality: {max: 999, min: 0}
    -  name: state
      type: State
      category: channel
      cardinality: {max: 999, min: 0}