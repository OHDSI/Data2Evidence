<template>
  <SplashScreen v-if="isLoading" />
  <div v-else-if="generationStatus !== 'COMPLETE'" class="status-message">
    Cohort should be generated before creating samples
  </div>

  <div v-else class="samples">
    <div class="samples__action">
      <ButtonMaterial class="samples-actions-btn" color="primary" @button-click="openCreateSampleDialog"
        >Create Sample</ButtonMaterial
      >
    </div>
    <div>
      <table class="samples__table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Size</th>
            <th>Criteria</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="sample in samples" :key="sample.id" @click="selectSample(sample.id)">
            <td>{{ sample.id }}</td>
            <td>{{ sample.name }}</td>
            <td>{{ sample.size }}</td>
            <td>{{ generateCriteria(sample) }}</td>
            <td>{{ new Date(sample.createdDate).toLocaleString() }}</td>
            <td>
              <button
                class="btn-remove-sample"
                @click.stop="deleteSample(sample.id)"
                title="Remove this sample"
                :disabled="deletingSampleId === sample.id"
              >
                <span v-if="deletingSampleId === sample.id" class="spinner"></span>
                <TrashIcon v-else />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="samples__sample-entry-table">
      <SplashScreen v-if="isLoadingSample" />
      <div v-else-if="activeSample">
        <h3>{{ activeSample.name }}</h3>
        <table class="samples__table">
          <thead>
            <tr>
              <th>Person ID</th>
              <th>Gender</th>
              <th>Age at index</th>
            </tr>
          </thead>
          <tbody v-if="activeSample.elements.length > 0">
            <tr v-for="element in activeSample.elements" :key="element.personId">
              <td>{{ element.personId }}</td>
              <td>{{ getGenderFromId(element.genderConceptId) }}</td>
              <td>{{ element.age }}</td>
            </tr>
          </tbody>
          <tbody v-else class="no-data">
            <tr>
              <td colspan="3">No data available</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <MessageBox
      v-if="createSampleDialogOpen"
      dim="true"
      dialogWidth="500px"
      messageType="custom"
      @close="closeCreateSampleDialog"
    >
      <template v-slot:header>Create Sample</template>
      <template v-slot:body>
        <div class="sample-dialog">
          <form @submit.prevent="createSample" class="sample-form">
            <div class="form-group">
              <label for="sampleName" class="form-label">Name<span class="required">*</span> </label>
              <input
                type="text"
                id="sampleName"
                class="form-control"
                :class="{ 'has-error': hasNameError }"
                v-model="newSampleName"
                placeholder="Enter sample name"
                @blur="touched.name = true"
                required
              />
              <p v-if="hasNameError" class="validation-message">Name is required</p>
            </div>

            <div class="form-group">
              <label for="sampleSize" class="form-label">Size<span class="required">*</span> </label>
              <input
                type="number"
                id="sampleSize"
                class="form-control"
                :class="{ 'has-error': hasSizeError }"
                v-model.number="newSampleSize"
                placeholder="Enter sample size"
                min="1"
                :max="props.patientCount"
                @blur="touched.size = true"
                required
              />
              <p v-if="hasSizeError" class="validation-message">{{ sizeErrorMessage }}</p>
            </div>

            <div class="form-group">
              <label for="samplingMethod" class="form-label">Sampling Method</label>
              <select id="samplingMethod" class="form-control" v-model="samplingMethod">
                <option value="random">Random</option>
                <option value="stratified">Stratified</option>
              </select>
            </div>

            <div class="stratified-section" v-if="samplingMethod === 'stratified'">
              <div class="form-group">
                <label for="ageCriteria" class="form-label">Age Criteria</label>
                <select id="ageCriteria" class="form-control" v-model="ageCriteria">
                  <option value="between">Between</option>
                  <option value="notBetween">Not Between</option>
                  <option value="lessThan">Less Than</option>
                  <option value="lessThanOrEqual">Less Than Or Equal To</option>
                  <option value="equalTo">Equal to</option>
                  <option value="greaterThan">Greater Than</option>
                  <option value="greaterThanOrEqual">Greater Than Or Equal To</option>
                </select>
              </div>

              <div v-if="ageCriteria === 'between' || ageCriteria === 'notBetween'">
                <div class="age-range-group">
                  <div class="form-group form-group-inline">
                    <label for="ageMinValue" class="form-label">Min Age</label>
                    <input
                      type="number"
                      id="ageMinValue"
                      class="form-control"
                      :class="{ 'has-error': hasAgeError }"
                      v-model.number="ageMinValue"
                      placeholder="Min"
                      min="0"
                      @blur="touched.age = true"
                    />
                  </div>
                  <div class="form-group form-group-inline">
                    <label for="ageMaxValue" class="form-label">Max Age</label>
                    <input
                      type="number"
                      id="ageMaxValue"
                      class="form-control"
                      :class="{ 'has-error': hasAgeError }"
                      v-model.number="ageMaxValue"
                      placeholder="Max"
                      min="0"
                      @blur="touched.age = true"
                    />
                  </div>
                </div>
                <p v-if="hasAgeError" class="validation-message">Min age must be less than max age</p>
              </div>
              <div v-else class="form-group">
                <label for="ageValue" class="form-label">Age Value</label>
                <input
                  type="number"
                  id="ageValue"
                  class="form-control"
                  v-model.number="ageValue"
                  placeholder="Enter age value"
                  min="0"
                />
              </div>

              <div class="form-group">
                <label class="form-label"> Gender Criteria </label>
                <div class="checkbox-group" @change="touched.gender = true">
                  <div class="checkbox-item">
                    <input type="checkbox" id="genderMale" value="male" v-model="genderCriteria" />
                    <label for="genderMale">Male</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="genderFemale" value="female" v-model="genderCriteria" />
                    <label for="genderFemale">Female</label>
                  </div>
                  <div class="checkbox-item">
                    <input type="checkbox" id="genderOther" value="other" v-model="genderCriteria" />
                    <label for="genderOther">Other</label>
                  </div>
                </div>
                <p v-if="hasGenderError" class="validation-message">Please select at least one gender option</p>
              </div>
            </div>
          </form>
        </div>
      </template>
      <template v-slot:footer>
        <div class="flex-spacer"></div>
        <AppButton :click="closeCreateSampleDialog" text="Cancel" :disabled="isCreatingSample" />
        <AppButton :click="handleCreateSample" text="Create" :disabled="!isFormValid || isCreatingSample" />
      </template>
    </MessageBox>
  </div>
</template>

<script setup lang="ts">
import ButtonMaterial from '@/query-filter/components/ButtonMaterial.vue'
import MessageBox from '@/components/MessageBox.vue'
import SplashScreen from '@/components/SplashScreen.vue'
import TrashIcon from '@/query-filter/components/icons/TrashIcon.vue'
import { ref, onMounted, computed, watch } from 'vue'
import { useStore } from 'vuex'
import { AgeFilter, GenderFilter, Sample, SampleElement, CreateSampleDTO } from '../types/SamplesTypes'
import AppButton from '@/lib/ui/app-button.vue'

const props = defineProps<{
  cohortDefinitionId: number
  sourceKey: string
  patientCount: number | null
}>()

const store = useStore()

const createSampleDialogOpen = ref(false)
const newSampleName = ref('')
const newSampleSize = ref(0)
const samplingMethod = ref('random')
const ageCriteria = ref('lessThan')
const ageValue = ref(0)
const ageMinValue = ref(0)
const ageMaxValue = ref(0)
const genderCriteria = ref<Array<string>>([])

// Track if user has interacted with fields
const touched = ref({
  name: false,
  size: false,
  gender: false,
  age: false,
})

const samples = computed<Sample[]>(() => store.getters.getSamples)
const isLoading = computed<boolean>(() => store.getters.isLoadingSamples)
const isLoadingSample = computed<boolean>(() => store.getters.isLoadingSampleById)
const isCreatingSample = computed<boolean>(() => store.getters.isCreatingSample)
const deletingSampleId = computed<number | null>(() => store.getters.getDeletingSampleId)
const activeSample = computed<Sample | null>(() => store.getters.getActiveSample)
const generationStatus = computed<string | null>(() => store.getters.getSampleGenerationStatus)

// Form validation - only for enabling/disabling submit button
const isFormValid = computed(() => {
  if (!newSampleName.value.trim()) return false
  if (!newSampleSize.value || newSampleSize.value < 1) return false
  if (props.patientCount && newSampleSize.value > props.patientCount) return false
  return true
})

// Validation errors - only shown after user interaction
const hasNameError = computed(() => {
  return touched.value.name && !newSampleName.value.trim()
})

const hasSizeError = computed(() => {
  if (!touched.value.size) return false
  if (!newSampleSize.value || newSampleSize.value < 1) return true
  if (props.patientCount && newSampleSize.value > props.patientCount) return true
  return false
})

const sizeErrorMessage = computed(() => {
  if (!newSampleSize.value || newSampleSize.value < 1) {
    return 'Size must be at least 1'
  }
  if (props.patientCount && newSampleSize.value > props.patientCount) {
    return `Size cannot exceed patient count (${props.patientCount})`
  }
  return ''
})

const hasGenderError = computed(() => {
  return samplingMethod.value === 'stratified' && touched.value.gender && genderCriteria.value.length === 0
})

const hasAgeError = computed(() => {
  if (samplingMethod.value !== 'stratified' || !touched.value.age) return false

  if (ageCriteria.value === 'between' || ageCriteria.value === 'notBetween') {
    return ageMinValue.value >= ageMaxValue.value
  }
  return false
})

onMounted(() => {
  store.dispatch('fetchSamples', {
    cohortDefinitionId: props.cohortDefinitionId,
    sourceKey: props.sourceKey,
  })
})

const resetState = () => {
  store.dispatch('resetSamplesState')
  newSampleName.value = ''
  newSampleSize.value = 0
}

watch(
  () => props.sourceKey,
  newSourceKey => {
    resetState()
    store.dispatch('fetchSamples', {
      cohortDefinitionId: props.cohortDefinitionId,
      sourceKey: newSourceKey,
    })
  }
)

// Reset stratified criteria when switching between sampling methods
watch(samplingMethod, (newMethod, oldMethod) => {
  if (oldMethod === 'stratified' && newMethod === 'random') {
    // Reset stratified fields when switching away from stratified
    ageCriteria.value = 'lessThan'
    ageValue.value = 0
    ageMinValue.value = 0
    ageMaxValue.value = 0
    genderCriteria.value = []
    touched.value.gender = false
    touched.value.age = false
  }
})

const openCreateSampleDialog = () => {
  createSampleDialogOpen.value = true
}

const closeCreateSampleDialog = () => {
  createSampleDialogOpen.value = false
  // Reset form
  newSampleName.value = ''
  newSampleSize.value = 0
  samplingMethod.value = 'random'
  ageCriteria.value = 'lessThan'
  ageValue.value = 0
  ageMinValue.value = 0
  ageMaxValue.value = 0
  genderCriteria.value = []
  // Reset touched state
  touched.value = {
    name: false,
    size: false,
    gender: false,
    age: false,
  }
}

const handleCreateSample = async () => {
  if (!isFormValid.value) return

  const payload = buildCreateSampleDTO()

  try {
    await store.dispatch('createSample', {
      cohortDefinitionId: props.cohortDefinitionId,
      payload,
      sourceKey: props.sourceKey,
    })
    closeCreateSampleDialog()
  } catch (error) {
    console.error('Failed to create sample:', error)
  }
}

const buildCreateSampleDTO = (): CreateSampleDTO => {
  if (samplingMethod.value === 'random') {
    // Random sample
    return {
      name: newSampleName.value.trim(),
      size: newSampleSize.value,
      age: null,
      gender: {
        otherNonBinary: true,
        conceptIds: [8507, 8532],
      },
    }
  } else {
    // Stratified sample
    const ageFilter: AgeFilter = {
      mode: ageCriteria.value as AgeFilter['mode'],
      min: ageCriteria.value === 'between' || ageCriteria.value === 'notBetween' ? ageMinValue.value : null,
      max: ageCriteria.value === 'between' || ageCriteria.value === 'notBetween' ? ageMaxValue.value : null,
      value: ageCriteria.value !== 'between' && ageCriteria.value !== 'notBetween' ? ageValue.value : null,
    }

    const conceptIds: number[] = []
    if (genderCriteria.value.includes('male')) {
      conceptIds.push(8507)
    }
    if (genderCriteria.value.includes('female')) {
      conceptIds.push(8532)
    }

    const genderFilter: GenderFilter = {
      otherNonBinary: genderCriteria.value.includes('other'),
      conceptIds,
    }

    return {
      name: newSampleName.value.trim(),
      size: newSampleSize.value,
      age: ageFilter,
      gender: genderFilter,
    }
  }
}

const createSample = () => {
  handleCreateSample()
}

const deleteSample = (sampleId: number) => {
  store.dispatch('deleteSample', {
    cohortDefinitionId: props.cohortDefinitionId,
    sampleId,
    sourceKey: props.sourceKey,
  })
}

const selectSample = (sampleId: number) => {
  store.dispatch('fetchSampleById', {
    cohortDefinitionId: props.cohortDefinitionId,
    sampleId,
  })
}

const generateCriteria = (sample: Sample) => {
  const criteriaString = []
  const { gender, age } = sample

  const genderCriteria = getGenderCriteria(gender)
  if (genderCriteria) {
    criteriaString.push(genderCriteria)
  }

  const ageCriteria = getAgeCriteria(age)
  criteriaString.push(ageCriteria)

  return criteriaString.join(', ')
}

const getAgeCriteria = (age: AgeFilter): string => {
  if (!age) return 'Any Age'

  const { mode, value, min, max } = age

  switch (mode) {
    case 'between':
      return `Between ${min} and ${max}`
    case 'notBetween':
      return `Not Between ${min} and ${max}`
    case 'lessThan':
      return `Less Than ${value}`
    case 'lessThanOrEqual':
      return `Less Than Or Equal To ${value}`
    case 'equalTo':
      return `Equal to ${value}`
    case 'greaterThan':
      return `Greater Than ${value}`
    case 'greaterThanOrEqual':
      return `Greater Than Or Equal To ${value}`
    default:
      return 'Any Age'
  }
}

const getGenderCriteria = (gender: GenderFilter) => {
  if (!gender) return ''

  const { otherNonBinary, conceptIds } = gender
  const hasMale = conceptIds.includes(8507)
  const hasFemale = conceptIds.includes(8532)
  const genderCount = conceptIds.length

  if (otherNonBinary) {
    if (genderCount === 0) return 'Other'
    if (genderCount === 2) return 'Any Gender'
    return hasMale ? 'Other, Male' : 'Other, Female'
  }

  if (genderCount === 2) return 'Male, Female'
  if (genderCount === 1) return hasMale ? 'Male' : 'Female'

  return ''
}

const getGenderFromId = (conceptId: number) => {
  const maleConceptId = 8507
  const femaleConceptId = 8532
  if (conceptId === maleConceptId) return 'Male'
  if (conceptId === femaleConceptId) return 'Female'
  return 'Other'
}
</script>
<style lang="scss" scoped>
.status-message {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-ui-darkest-text);
  font-size: 1rem;
  font-weight: 500;
  text-align: center;
  min-height: 100px;
}

.samples {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 16px;

  &__action {
    display: flex;
    justify-content: flex-end;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #ddd;
    font-size: 0.9rem;

    thead {
      background-color: #f5f5f5;
    }

    th {
      padding: 0.75rem;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #ddd;
      color: #333;
    }

    td {
      padding: 0.75rem;
      border-bottom: 1px solid #ddd;
      color: #666;
    }

    tbody tr:hover {
      background-color: #f9f9f9;
    }

    .btn-remove-sample {
      border: 1px solid transparent;
      background: transparent;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      padding: 4px 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      &:not(:disabled):hover {
        svg {
          fill: var(--color-feedback-error);
        }
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--color-neutral-lightest);
        border-top: 2px solid var(--color-primary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }
    .no-data {
      text-align: center;
      font-weight: bold;
    }
  }

  &__sample-entry-table {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
  }

  .sample-dialog {
    padding: 1.5rem;

    .sample-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      &.form-group-inline {
        flex: 1;
      }
    }

    .form-label {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--color-ui-darkest-text);

      .required {
        color: var(--color-feedback-error);
      }
    }

    .form-control {
      padding: 0.625rem 0.75rem;
      border: 1px solid var(--color-ui-medium-border);
      border-radius: 4px;
      font-size: 0.875rem;
      transition: border-color 0.2s, box-shadow 0.2s;
      background-color: var(--color-ui-lightest-bg);

      &:focus {
        outline: none;
        border-color: var(--color-form-control-focus, var(--color-primary));
        box-shadow: 0 0 0 3px var(--color-primary-extra-lightest, rgba(0, 102, 204, 0.1));
      }

      &::placeholder {
        color: var(--color-ui-light-text);
      }

      &:disabled {
        background-color: var(--color-ui-light-bg);
        cursor: not-allowed;
      }

      &.has-error {
        border-color: var(--color-feedback-error);
      }
    }

    select.form-control {
      cursor: pointer;
    }

    .stratified-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background-color: var(--color-ui-extra-light-bg);
      border: 1px solid var(--color-ui-light-border);
      border-radius: 6px;
      margin-top: 0.5rem;
    }

    .validation-message {
      margin: 0.25rem 0 0 0;
      font-size: 0.75rem;
      color: var(--color-feedback-error);
      font-style: italic;
    }

    .age-range-group {
      display: flex;
      gap: 1rem;
    }

    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      input[type='checkbox'] {
        width: 1rem;
        height: 1rem;
        cursor: pointer;
        accent-color: var(--color-primary);
      }

      label {
        font-weight: 400;
        font-size: 0.875rem;
        cursor: pointer;
        margin: 0;
        color: var(--color-ui-dark-text);
      }
    }
  }

  .flex-spacer {
    flex: 1;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>

