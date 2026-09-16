// A department deleted in simple-directory keeps its id on the resources it owned, but not its name:
// the identity webhook removed it. These helpers build the label to display in that case.
import { useSession } from './session.js'

export type DisplayableOwner = { department?: string, departmentName?: string, [key: string]: unknown }

// plain strings: consumers may ship the runtime-only vue-i18n build that cannot compile inline messages
const formerDepartment: Record<string, string> = {
  fr: 'Ancien département',
  en: 'Former department'
}

/** Label of a department: its name, or "Former department (<id>)" once it was deleted. */
export function formatDepartmentLabel (lang: string, department?: string, departmentName?: string): string | undefined {
  if (!department) return undefined
  return departmentName || `${formerDepartment[lang] ?? formerDepartment.en} (${department})`
}

/** Department labels in the language of the current session. */
export function useDisplayOwner () {
  const session = useSession()

  const departmentLabel = (department?: string, departmentName?: string) => {
    return formatDepartmentLabel(session.lang.value, department, departmentName)
  }

  /** Same owner with departmentName filled for a deleted department (for components that only read departmentName). */
  const displayOwner = <T extends DisplayableOwner>(owner: T): T => {
    if (!owner.department || owner.departmentName) return owner
    return { ...owner, departmentName: departmentLabel(owner.department) }
  }

  return { departmentLabel, displayOwner }
}

export default useDisplayOwner
