const boolItem = {
  getIFR() {
    throw new Error('getIFR must be implemented by BoolItem subclass')
  },
  setFilterValues() {
    throw new Error('setFilterValues must be implemented by BoolItem subclass')
  },
}

export default boolItem
