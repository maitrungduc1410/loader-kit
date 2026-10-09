import type { Ref } from 'vue';

/**
 * Closes a modal dialog on a click on its backdrop. The press has to start there too: dragging a
 * slider and letting go outside the panel fires a click on the dialog as well.
 */
export function useBackdropClose(dialog: Ref<HTMLDialogElement | undefined>, close: () => void) {
  let pressedBackdrop = false;
  return {
    onPointerdown(event: PointerEvent) {
      pressedBackdrop = event.target === dialog.value;
    },
    onClick(event: MouseEvent) {
      if (pressedBackdrop && event.target === dialog.value) close();
      pressedBackdrop = false;
    },
  };
}
