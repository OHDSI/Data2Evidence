/**
 * Vue component for initial criteria editor using configuration-based approach
 */

import { defineComponent, ref, computed, PropType } from 'vue'
import criteriaConfigLoader, { CohortExpression, DropdownOption } from './CriteriaConfigLoader'

export interface InitialCriteriaParams {
  expression: CohortExpression
  buttonText?: string
}

/**
 * Vue 3 Composition API component for Initial Criteria Editor
 */
export const InitialCriteriaEditorConfigBased = defineComponent({
  name: 'InitialCriteriaEditorConfigBased',
  
  props: {
    expression: {
      type: Object as PropType<CohortExpression>,
      required: true
    },
    buttonText: {
      type: String,
      default: 'Add Initial Event'
    }
  },

  setup(props) {
    // Reactive state
    const dropdownOpen = ref(false)

    // Generate dropdown options from configuration
    const primaryCriteriaOptions = computed((): DropdownOption[] => {
      const options = criteriaConfigLoader.generateDropdownOptions(
        'initialEvents',
        props.expression,
        'PrimaryCriteria'
      )

      // Add any custom behavior for specific criteria types
      return options.map(option => {
        // Special handling for "From Reusable" option
        if (option.id === 'fromReusable') {
          const originalAction = option.action
          option.action = () => {
            // Custom implementation for reusable selection
            // In a real implementation, this would open a modal
            console.log('Opening reusable criteria selector...')
            
            // This would be implemented as:
            // const modal = useReusablesModal()
            // modal.show({
            //   expression: props.expression,
            //   targetList: 'PrimaryCriteria'
            // })
            
            originalAction()
          }
        }
        return option
      })
    })

    // Methods
    const getCriteriaIcon = (criteriaId: string): string => {
      const option = primaryCriteriaOptions.value.find(opt => opt.id === criteriaId)
      return option ? option.icon : 'fa-question'
    }

    const getAttributesForCriteria = (criteriaId: string) => {
      return criteriaConfigLoader.getAttributesForCriteria(criteriaId)
    }

    const toggleDropdown = (): void => {
      dropdownOpen.value = !dropdownOpen.value
    }

    const selectOption = (option: DropdownOption): void => {
      if (option.action) {
        option.action()
        dropdownOpen.value = false
      }
    }

    const closeDropdown = (): void => {
      dropdownOpen.value = false
    }

    // Return reactive properties and methods for template
    return {
      // State
      dropdownOpen,
      primaryCriteriaOptions,
      
      // Methods
      getCriteriaIcon,
      getAttributesForCriteria,
      toggleDropdown,
      selectOption,
      closeDropdown
    }
  }
})

export default InitialCriteriaEditorConfigBased