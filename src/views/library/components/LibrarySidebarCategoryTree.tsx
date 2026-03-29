import {
  mergeVisibleOrderIntoRoots,
  sortedTopLevelLibraryCategories,
  targetLibraryViewForCategoryScope,
} from '@/domains/library';
import { useReorderLibraryCategories } from '@/hooks/useLibraryCategories';
import type { LibraryCategory } from '@/types';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, ListGroupItem } from 'react-bootstrap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TbFolder, TbGripVertical } from 'react-icons/tb';
import type { LibraryViewParam } from './libraryUrlState';

const SIDEBAR_CATEGORY_PAGE_SIZE = 5;

type LibrarySidebarCategoryTreeProps = {
  /** Full category list (for merging sort order after drag). */
  allCategories: LibraryCategory[];
  /** Categories visible for the current tab (filtered by scope). */
  visibleCategories: LibraryCategory[];
  categoryId: string | null;
  itemBrowseViews: boolean;
  onTagChange: (tag: string | null) => void;
  onCategoryPick: (id: string | null) => void;
  onViewChange: (v: LibraryViewParam) => void;
};

type SortableRowProps = LibrarySidebarCategoryTreeProps & {
  category: LibraryCategory;
};

function SortableCategoryRow({
  category,
  categoryId,
  itemBrowseViews,
  onTagChange,
  onCategoryPick,
  onViewChange,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.$id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <ListGroupItem ref={setNodeRef} as="div" style={style} className="p-0 border-start-0 border-end-0">
      <div className="d-flex align-items-stretch min-w-0">
        <div className="d-flex align-items-center flex-shrink-0 border-0 rounded-0 py-2 ps-2 pe-0">
          <button
            type="button"
            className="btn btn-link p-0 text-body-secondary lh-1 me-1 user-select-none"
            style={{ touchAction: 'none', cursor: 'grab' }}
            aria-label={`Drag to reorder ${category.name}`}
            {...attributes}
            {...listeners}
          >
            <TbGripVertical className="fs-5" />
          </button>
        </div>
        <button
          type="button"
          className={`list-group-item list-group-item-action border-0 rounded-0 flex-grow-1 text-start d-flex align-items-center py-2 px-2 min-w-0 ${
            categoryId === category.$id && itemBrowseViews ? 'active' : ''
          }`}
          onClick={() => {
            onTagChange(null);
            if (categoryId === category.$id) {
              onCategoryPick(null);
            } else {
              onCategoryPick(category.$id);
              onViewChange(targetLibraryViewForCategoryScope(category.scope));
            }
          }}
        >
          <TbFolder className="align-middle me-1 flex-shrink-0 opacity-75" />
          <span className="align-middle text-truncate">{category.name}</span>
        </button>
      </div>
    </ListGroupItem>
  );
}

const LibrarySidebarCategoryTree = ({
  allCategories,
  visibleCategories,
  categoryId,
  itemBrowseViews,
  onTagChange,
  onCategoryPick,
  onViewChange,
}: LibrarySidebarCategoryTreeProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const reorderMutation = useReorderLibraryCategories();
  const prevCategoryIdRef = useRef<string | null | undefined>(undefined);

  const pageCount = Math.max(1, Math.ceil(visibleCategories.length / SIDEBAR_CATEGORY_PAGE_SIZE));

  useEffect(() => {
    if (pageIndex > pageCount - 1) {
      setPageIndex(Math.max(0, pageCount - 1));
    }
  }, [pageCount, pageIndex]);

  useEffect(() => {
    if (categoryId === prevCategoryIdRef.current) return;
    prevCategoryIdRef.current = categoryId ?? null;
    if (!categoryId) return;
    const idx = visibleCategories.findIndex((c) => c.$id === categoryId);
    if (idx < 0) return;
    setPageIndex(Math.floor(idx / SIDEBAR_CATEGORY_PAGE_SIZE));
  }, [categoryId, visibleCategories]);

  const pageStart = pageIndex * SIDEBAR_CATEGORY_PAGE_SIZE;
  const pageCategories = useMemo(
    () => visibleCategories.slice(pageStart, pageStart + SIDEBAR_CATEGORY_PAGE_SIZE),
    [visibleCategories, pageStart],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const allRootsSorted = useMemo(() => sortedTopLevelLibraryCategories(allCategories), [allCategories]);

  const byId = useMemo(() => new Map(allCategories.map((c) => [c.$id, c])), [allCategories]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id || reorderMutation.isPending) return;

      const ids = pageCategories.map((c) => c.$id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const reorderedSlice = arrayMove(pageCategories, oldIndex, newIndex);
      const newFullVisible = [
        ...visibleCategories.slice(0, pageStart),
        ...reorderedSlice,
        ...visibleCategories.slice(pageStart + pageCategories.length),
      ];
      const merged = mergeVisibleOrderIntoRoots(allRootsSorted, newFullVisible);
      reorderMutation.mutate(merged.map((c, i) => ({ categoryId: c.$id, sortOrder: i })));
    },
    [
      allRootsSorted,
      pageCategories,
      pageStart,
      reorderMutation,
      visibleCategories,
    ],
  );

  const activeCategory = activeId ? byId.get(activeId) : undefined;

  if (visibleCategories.length === 0) {
    return null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={pageCategories.map((c) => c.$id)} strategy={verticalListSortingStrategy}>
        {pageCategories.map((cat) => (
          <SortableCategoryRow
            key={cat.$id}
            category={cat}
            allCategories={allCategories}
            visibleCategories={visibleCategories}
            categoryId={categoryId}
            itemBrowseViews={itemBrowseViews}
            onTagChange={onTagChange}
            onCategoryPick={onCategoryPick}
            onViewChange={onViewChange}
          />
        ))}
      </SortableContext>
      {pageCount > 1 ? (
        <ListGroupItem as="div" className="border-0 py-2 px-2 bg-transparent">
          <div className="d-flex align-items-center justify-content-between gap-1">
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none fs-xxs"
              disabled={pageIndex <= 0}
              type="button"
              aria-label="Previous categories page"
              onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
            >
              Prev
            </Button>
            <span className="text-muted fs-xxs text-truncate flex-shrink-0">
              {pageIndex + 1} / {pageCount}
            </span>
            <Button
              variant="link"
              size="sm"
              className="p-0 text-decoration-none fs-xxs"
              disabled={pageIndex >= pageCount - 1}
              type="button"
              aria-label="Next categories page"
              onClick={() => setPageIndex((i) => Math.min(pageCount - 1, i + 1))}
            >
              Next
            </Button>
          </div>
        </ListGroupItem>
      ) : null}
      <DragOverlay dropAnimation={null}>
        {activeCategory ? (
          <ListGroupItem as="div" className="p-0 shadow-sm border">
            <div className="d-flex align-items-center py-2 px-3 bg-body">
              <TbGripVertical className="fs-5 text-muted me-2 flex-shrink-0" />
              <TbFolder className="align-middle me-1 opacity-75 flex-shrink-0" />
              <span className="text-truncate fw-medium">{activeCategory.name}</span>
            </div>
          </ListGroupItem>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default LibrarySidebarCategoryTree;
