/**
 * Lets a component defer its initial work until the collapsed section that
 * contains it is first opened.
 *
 * Every `/page/info_section.mas` renders its content through
 * `CXGN::Page::Widgets::collapser`, which wraps that content in
 *
 *     <div id="<section id>_content" class="collapse [in]"> ... </div>
 *
 * and Bootstrap's collapse plugin fires `shown.bs.collapse` on that element
 * when it opens.
 *
 * This utility runs `init` the first time the nearest `.collapse` ancestor
 * of the element matched by `selector` first becomes visible. This is either
 * because the section itself is expanded, or because a parent section is expanded.
 *
 * `init` runs straight away when there is no wrapper at all
 * (`collapsible => 0`) or when the wrapper is already open
 * (`info_section_collapsed => 0`), so a component never waits for an expansion
 * that is not going to happen.
 *
 * @param selector - A CSS selector for an element inside the section. The
 *   wrapper is located by walking up the DOM from that element, so the caller
 *   does not have to know or pass in the section's id. A selector that matches
 *   nothing behaves like a missing wrapper: `init` runs immediately.
 * @param init - The work to run once the section is open.
 */
export const onExpand = (selector: string, init: () => void): void => {
    const section = document.querySelector(selector)?.closest('.collapse');

    if (!section || !isCollapsed(section)) {
        init();
        return;
    }

    const handler = () => {
        if (isCollapsed(section)) {
            return;
        }

        walkUpSections(section, (el) => {
            jQuery(el).off('shown.bs.collapse', handler);
        });

        init();
    };

    walkUpSections(section, (el) => {
        jQuery(el).on('shown.bs.collapse', handler);
    });
};

/**
 * `collapser` emits the Bootstrap 3 open marker, `.in`.
 * 
 * Walk the DOM upwards from the given element, checking if the element OR
 * any ancestor contains the "collapse" class but NOT the "in" class.
 * 
 * @param element - The starting element for the upward walk.
 * @returns `true` if any ancestor has the "collapse" class but not the "in" class, `false` otherwise.
 */
const isCollapsed = (element: Element | null | undefined): boolean => {
    return walkUpSections(element, (el) => {
        return !el.classList.contains('in');
    });
};

/**
 * Walks up the DOM tree from the given element, calling the callback on each element with the "collapse" class.
 * Stops if the callback returns `true`.
 * 
 * @param element - The starting element for the upward walk.
 * @param callback - The function to call on each element with the "collapse" class. Should return `true` to stop walking up.
 * @returns `true` if the callback returned `true` for any element, `false` otherwise.
 */
const walkUpSections = (element: Element | null | undefined, callback: (el: Element) => boolean | undefined): boolean => {
    while (element) {
        if (element.classList.contains('collapse') && callback(element)) {
            return true;
        }
        element = element.parentElement;
    }
    return false;
};
