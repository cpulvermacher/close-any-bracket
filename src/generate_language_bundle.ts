import * as fs from 'fs';
import * as path from 'path';

interface Component {
    title: string;
    require?: string | string[];
    owner: string;
    alias?: string;
}

interface Components {
    [key: string]: Component;
}

function readComponentsFile(filePath: string): Components {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data)['languages'];
}

function generateImports(components: Components): string[] {
    const visited: { [key: string]: boolean } = {};
    const imports: string[] = [];

    function visit(key: string) {
        if (visited[key] || key === 'meta') {
            return;
        }
        visited[key] = true;

        const component = components[key];
        if (component?.require) {
            const dependencies = Array.isArray(component.require)
                ? component.require
                : [component.require];
            dependencies.forEach(visit);
        }

        imports.push(`import 'prismjs/components/prism-${key}';`);
    }

    Object.keys(components).forEach(visit);

    return imports;
}

const components = readComponentsFile(
    path.resolve(__dirname, '../node_modules/prismjs/components.json')
);
const imports = generateImports(components);

console.log('// AUTO-GENERATED VIA: npm run generate-language-bundle');
console.log(imports.join('\n'));
