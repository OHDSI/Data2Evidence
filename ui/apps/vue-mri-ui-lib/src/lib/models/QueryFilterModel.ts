/**
 * Model for the new query filter card system
 */

export interface QueryFilterChip {
  id: string;
  label: string;
  value: string;
  color?: string;
}

export interface QueryFilterCondition {
  id: string;
  conceptSet: string;
  conceptSetId?: string;
  chips: QueryFilterChip[];
  isEditing?: boolean;
}

export class QueryFilterCardModel {
  id: string;
  title: string;
  type: 'inclusion' | 'exclusion';
  conditions: QueryFilterCondition[];
  isExpanded: boolean;

  constructor(data: Partial<QueryFilterCardModel> = {}) {
    this.id = data.id || this.generateId();
    this.title = data.title || '';
    this.type = data.type || 'inclusion';
    this.conditions = data.conditions || [];
    this.isExpanded = data.isExpanded !== undefined ? data.isExpanded : true;
  }

  private generateId(): string {
    return `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addCondition(condition: QueryFilterCondition): void {
    this.conditions.push(condition);
  }

  removeCondition(conditionId: string): void {
    const index = this.conditions.findIndex(c => c.id === conditionId);
    if (index > -1) {
      this.conditions.splice(index, 1);
    }
  }

  updateCondition(conditionId: string, updates: Partial<QueryFilterCondition>): void {
    const condition = this.conditions.find(c => c.id === conditionId);
    if (condition) {
      Object.assign(condition, updates);
    }
  }

  addChipToCondition(conditionId: string, chip: QueryFilterChip): void {
    const condition = this.conditions.find(c => c.id === conditionId);
    if (condition) {
      condition.chips.push(chip);
    }
  }

  removeChipFromCondition(conditionId: string, chipId: string): void {
    const condition = this.conditions.find(c => c.id === conditionId);
    if (condition) {
      const chipIndex = condition.chips.findIndex(chip => chip.id === chipId);
      if (chipIndex > -1) {
        condition.chips.splice(chipIndex, 1);
      }
    }
  }

  toggle(): void {
    this.isExpanded = !this.isExpanded;
  }

  toJSON(): any {
    return {
      id: this.id,
      title: this.title,
      type: this.type,
      conditions: this.conditions,
      isExpanded: this.isExpanded
    };
  }
}

export class QueryFilterManager {
  filters: QueryFilterCardModel[];

  constructor() {
    this.filters = [];
  }

  addFilter(filter: QueryFilterCardModel): void {
    this.filters.push(filter);
  }

  removeFilter(filterId: string): void {
    const index = this.filters.findIndex(f => f.id === filterId);
    if (index > -1) {
      this.filters.splice(index, 1);
    }
  }

  getFilter(filterId: string): QueryFilterCardModel | undefined {
    return this.filters.find(f => f.id === filterId);
  }

  getAllFilters(): QueryFilterCardModel[] {
    return this.filters;
  }

  getInclusionFilters(): QueryFilterCardModel[] {
    return this.filters.filter(f => f.type === 'inclusion');
  }

  getExclusionFilters(): QueryFilterCardModel[] {
    return this.filters.filter(f => f.type === 'exclusion');
  }
}