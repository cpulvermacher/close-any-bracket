/* this file contains examples used to test closeToIndentAtLine().
 * Examples should contain the string "expect: " followed by the expected closing brackets,
 * usually in the form of a comment, e.g. "// expect: }".
 */

const javascript = `
/** some ignored brackets: {[( */
// ignored again: {[(
// const alsoIgnored = '({[';

// expect:
if (abc) { // expect:
    abc.def({ // expect:
        a: 1, // expect:
        c: [ // expect:
            1, // expect:
            2, // expect:
        // expect: ]
        ] 
        // expect:
    // expect: })
    });
    // expect: 
// expect: }
}
// expect: 
`;

/** maps VSCode language identifier to code example */
export const closeToIndentExamples = [
    { language: 'javascript', code: javascript },
    { language: 'typescript', code: javascript },
];
