import { EntityListPage } from "@/components/layouts/entity-list-page"
import { entityPages } from "@/config/modules"

export default function Page() {
  const config = entityPages["sale-order"]
  return (
    <EntityListPage
      title={config.title}
      moduleName={config.moduleName}
    />
  )
}
