/**
 * Glue between @testing-library/react and the tape + JSDOM harness in
 * run-tests.js.
 *
 * Two things the library cannot arrange for itself here:
 *
 *  - Its automatic `cleanup()` is registered through a global `afterEach` (or
 *    mocha's `teardown`). The test bundles run inside a bare JSDOM window where
 *    neither exists, so cleanup is attached to tape's `t.teardown()` instead.
 *  - React only treats a state update as expected (i.e. inside `act()`) when
 *    `IS_REACT_ACT_ENVIRONMENT` is set on the global object. RTL sets it around
 *    its own `act()` calls but not for updates that land later, such as a fetch
 *    resolving in a `useEffect`, so it is enabled for the whole run.
 */

import type { ReactElement } from 'react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import {
    cleanup as testingLibraryCleanup,
    render as testingLibraryRender,
} from '@testing-library/react';

// Inside the JSDOM window the global object is `window` itself.
(window as Window & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The slice of tape's test object this module needs. Declared structurally so
 * the helper does not depend on @types/tape being installed.
 */
interface TeardownCapable {
    teardown: (callback: () => void) => void;
}

/**
 * Renders `ui` into a fresh container attached to document.body and tears it
 * down when the tape test (or subtest) `t` finishes, so tests stay isolated.
 *
 * `cleanup()` unmounts every container rendered during the current test, so
 * several `render()` calls inside one test are all cleaned up together.
 */
export const render = (
    t: TeardownCapable,
    ui: ReactElement,
    options?: RenderOptions,
): RenderResult => {
    const result = testingLibraryRender(ui, options);
    t.teardown(testingLibraryCleanup);
    return result;
};

export { fireEvent, screen, waitFor, within } from '@testing-library/react';
export { act } from 'react';
export { default as userEvent } from '@testing-library/user-event';
