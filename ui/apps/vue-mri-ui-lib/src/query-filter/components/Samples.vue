<template>
  <SplashScreen v-if="isLoading" />
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
        <form @submit.prevent="createSample">
          <div>
            <label for="sampleName">Name:</label>
            <input type="text" id="sampleName" v-model="newSampleName" />
          </div>
          <div>
            <label for="sampleSize">Size:</label>
            <input type="number" id="sampleSize" v-model="newSampleSize" />
          </div>
        </form>
      </template>
      <template v-slot:footer>
        <button @click="createSample">Create</button>
        <button @click="closeCreateSampleDialog">Cancel</button>
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
import { AgeFilter, GenderFilter, Sample, SampleElement } from '../types/SamplesTypes'

const props = defineProps<{
  cohortDefinitionId: number
  sourceKey: string
  patientCount: number | null
}>()

const store = useStore()

const createSampleDialogOpen = ref(false)
const newSampleName = ref('')
const newSampleSize = ref(0)

const samples = computed<Sample[]>(() => store.getters.getSamples)
const isLoading = computed<boolean>(() => store.getters.isLoadingSamples)
const isLoadingSample = computed<boolean>(() => store.getters.isLoadingSampleById)
const deletingSampleId = computed<number | null>(() => store.getters.getDeletingSampleId)
const activeSample = computed<Sample | null>(() => store.getters.getActiveSample)

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

const openCreateSampleDialog = () => {
  createSampleDialogOpen.value = true
}

const closeCreateSampleDialog = () => {
  createSampleDialogOpen.value = false
}

const createSample = () => {
  store.dispatch('createSample', {
    cohortDefinitionId: props.cohortDefinitionId,
    name: newSampleName.value,
    size: newSampleSize.value,
  })
  closeCreateSampleDialog()
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
<style lang="scss">
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
    min-height: 400px;
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

