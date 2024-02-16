/* this file contains examples used to test closeToIndentAtLine().
 * Examples should contain the string "expect: " followed by the expected closing brackets,
 * usually in the form of a comment, e.g. "// expect: }".
 */

const javascript = `
/** some ignored brackets: {[( */
// ignored again: {[(
const alsoIgnored = '({[';

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

const jsonWithComments = `
{
    // expect:
    "list": [ // expect:
        1, // expect:
        2, // expect:
    // expect: ]
// expect: ]}
    ] 
    // expect:
// expect: }
}
// expect:
`;

const golang = `
/** some ignored brackets: {[( */
// ignored again: {[(
alsoIgnored := "({[";

//expect:
for i in 1..5 { // expect:
    println!("Value of i is: {}", i);
    // expect:
// expect: }
}
// expect:
`;

const java = `
// expect:
public class Main {
    // expect:
    private final String ignored = "{[(";

    // expect:
    public static void main(String[] args) {
        // expect:
        // ignored brackets: {[(

        /*
         * ignored brackets: {[(
         * expect:
         */

        // expect:
        /**
         * This is a Javadoc comment
         * ignored brackets: {[(
         */
        for (int i = 0; i < 5; i++
            // expect:
        // expect: )
        ) {
            // expect:
            System.out.println("Value of i is: " + i);
        // expect: }
    // expect: }}
// expect: }}}
        }
    }
}
// expect:
`;

const python = `
# ignored: {[(
alsoIgnored = "({["
alsoIgnored2 = '({['
alsoIgnored3 = f'({['

# expect:

'''
multi-line comments also ignored
{[(
'''

"""
and this type of multi-line comment as well
{[(
"""

# expect:
for i in range(5):
    # expect:
    print(f"Value of i is: {i}"
    # expect: )
    )
# expect:

somethingNested = {
    'key': [
        (
            1, 
            2,
            3
        # expect: )
    # expect: )]
# expect: )]}
        ),
    ]
}
// expect:
`;

const csharp = `
class Program
{
    // expect: 
    static void Main(string[] args)
    {
        // {[[

        /*
         * {[[
         */

        /// <summary>
        /// {[(
        /// </summary>

        const string alsoIgnored = "{[(";


        // expect:
        for (int i = 0; i < 5; i++)
        {
            // expect:
            System.Console.WriteLine("Value of i is: " + i
            // expect: )
// expect: )}}}
            );
        // expect: }
        }
// expect: }}
    }
}
// expect: 
`;

const shellscript = `# expect:
# {[(

: '
Also ignored in multi-line comments
{[(
'

MY_STRING="{[("

# expect:
dummy() {
    echo "test
    # expect:
# expect: }
}

# expect:
`;

// note: [] not supported
const css = `
/* {( */

/* expect:
*/

@font-face {
	src: url(./something.otf
/* expect: )} */
    );
}

@keyframes example {
    0% {
        left: 0
        /* expect:
        */
    /* expect: } */
/* expect: }} */
    }
    /* expect: 
    */
/* expect: } */
}

a[title="{(["]
{
    /* expect:
    */
    color: red;
/* expect: } */
}


/* expect:
*/
`;

/** maps VSCode language identifier to code example */
export const closeToIndentExamples = [
    { language: 'javascript', code: javascript },
    { language: 'typescript', code: javascript },
    { language: 'jsonc', code: jsonWithComments },
    { language: 'go', code: golang },
    { language: 'java', code: java },
    { language: 'python', code: python },
    { language: 'csharp', code: csharp },
    { language: 'shellscript', code: shellscript },
    { language: 'css', code: css },
];
