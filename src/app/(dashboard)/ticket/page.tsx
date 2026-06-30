import { EntityListPage } from "@/components/layouts/entity-list-page"
import { entityPages } from "@/config/modules"

export default function Page() {
  const config = entityPages["ticket"]
  return (
    <EntityListPage
      title={config.title}
      moduleName={config.moduleName}
    />
  )
}
