interface PreviewBlock {
  top: number
  height: number
  variant: 'create' | 'move'
}

interface DragPreviewProps {
  previewBlock: PreviewBlock | null
}

export default function DragPreview({ previewBlock }: DragPreviewProps) {
  if (!previewBlock) {
    return null
  }

  return (
    <div
      className={
        previewBlock.variant === 'create'
          ? 'pointer-events-none absolute inset-x-3 z-20 rounded-lg border border-primary/60 bg-primary/15'
          : 'pointer-events-none absolute inset-x-3 z-20 rounded-lg border border-dashed border-primary/70 bg-primary/10'
      }
      style={{
        top: previewBlock.top,
        height: previewBlock.height,
      }}
    />
  )
}
