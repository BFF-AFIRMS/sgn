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
 * when it opens. That event is the only contract this module relies on: no
 * section ids are named, and nothing is threaded down from the page that owns
 * the section.
 */

/**
 * Runs `init` the first time the nearest `.collapse` ancestor of the element
 * `selector` matches opens.
 *
 * The *innermost* wrapper is the one picked up, so a component placed in a
 * sub-section reacts to the sub-section opening rather than to the outer
 * section opening.
 *
 * `init` runs straight away when there is no wrapper at all
 * (`collapsible => 0`) or when the wrapper is already open
 * (`info_section_collapsed => 0`), so a component never waits for an expansion
 * that is not going to happen.
 *
 * @param selector - A CSS selector for an element inside the section, used to
 *   locate the wrapper. A selector that matches nothing behaves like a missing
 *   wrapper: `init` runs immediately.
 * @param init - The work to run once the section is open.
 */
export const onExpand = (selector: string, init: () => void): void => {
    const section = document.querySelector(selector)?.closest('.collapse');

    // `collapser` emits the Bootstrap 3 open marker, `.in`.
    if (!section || section.classList.contains('in')) {
        init();
        return;
    }

    const handler = (event: JQuery.TriggeredEvent) => {
        // `collapser` stops the propagation of `show`/`hide` on nested
        // sections but not of `shown`, so a nested section opening reaches
        // this wrapper too. Only react when this wrapper is the one opening.
        if (event.target !== section) {
            return;
        }
        jQuery(section).off('shown.bs.collapse', handler);
        init();
    };

    jQuery(section).on('shown.bs.collapse', handler);
};
