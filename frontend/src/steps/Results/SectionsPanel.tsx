import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SECTION_LABELS, type SectionKey } from './sectionConfig'

interface SectionsPanelProps {
  // 完整的 6 项顺序（含未勾选的），拖拽只改这个数组。
  order: SectionKey[]
  enabled: Record<SectionKey, boolean>
  onToggle: (key: SectionKey) => void
  // 把「谁拖到了谁的位置」交给父组件用 arrayMove 处理，面板本身不持有顺序状态。
  onReorder: (activeId: SectionKey, overId: SectionKey) => void
}

// 单行：一个拖拽手柄 + 一个 checkbox + 模块名。勾选与否只影响视觉（变灰），
// 不影响是否可拖拽——6 行都在同一个 SortableContext 里，避免可视下标和真实下标的换算。
function SortableSectionRow({
  id,
  checked,
  onToggle,
}: {
  id: SectionKey
  checked: boolean
  onToggle: (key: SectionKey) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`section-row${checked ? '' : ' section-row--disabled'}${
        isDragging ? ' section-row--dragging' : ''
      }`}
    >
      {/* 拖拽 listeners 只挂在手柄上，不挂整行：整行里有 checkbox，整行可拖会和点击冲突。 */}
      <button
        type="button"
        className="drag-handle"
        aria-label={`Reorder ${SECTION_LABELS[id]}`}
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <label className="section-row-label">
        <input type="checkbox" checked={checked} onChange={() => onToggle(id)} />
        <span>{SECTION_LABELS[id]}</span>
      </label>
    </li>
  )
}

export function SectionsPanel({ order, enabled, onToggle, onReorder }: SectionsPanelProps) {
  const sensors = useSensors(
    // distance:4 —— 手指/指针要移动超过 4px 才算拖拽，避免把手柄上的普通点击误判成拖拽。
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // 键盘可达性：手柄聚焦后用方向键也能排序。
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    onReorder(active.id as SectionKey, over.id as SectionKey)
  }

  return (
    <div className="sections-panel">
      <span className="eyebrow">Sections</span>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ul className="section-list">
            {order.map((key) => (
              <SortableSectionRow
                key={key}
                id={key}
                checked={enabled[key]}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  )
}
