/**
 * Generates a Verilog module instantiation snippet string.
 *
 * No VS Code dependency – safe for use in tests.
 */

import { Module, Port, Parameter } from './database';

/**
 * Build a VS Code snippet string for instantiating the given module.
 *
 * Parameters are filled with their default values as placeholders.
 * Port connections use the same name as the port.
 *
 * @param mod  The module to instantiate.
 * @returns    A snippet string using VS Code snippet syntax (${N:placeholder}).
 */
export function buildInstantiationSnippet(mod: Module): string {
    const lines: string[] = [];
    let tabStop = 1;

    if (mod.parameterList && mod.parameterList.length > 0) {
        const overridableParams = mod.parameterList.filter(p => p.kind !== 'localparam');
        if (overridableParams.length > 0) {
            const paramLines = overridableParams.map(param => {
                const defaultVal = (param.exprText !== null && param.exprText !== undefined && param.exprText !== '')
                    ? param.exprText
                    : (param.value !== null ? String(param.value) : param.name);
                return `    .${param.name}(\${${tabStop++}:${defaultVal}})`;
            });
            lines.push(`${mod.name} #(`);
            lines.push(paramLines.join(',\n'));
            lines.push(`) \${${tabStop++}:u_${mod.name}}`);
        } else {
            lines.push(`${mod.name} \${${tabStop++}:u_${mod.name}}`);
        }
    } else {
        lines.push(`${mod.name} \${${tabStop++}:u_${mod.name}}`);
    }

    if (mod.ports && mod.ports.length > 0) {
        lines[lines.length - 1] += ' (';
        const portLines = mod.ports.map(port => {
            return `    .${port.name}(\${${tabStop++}:${port.name}})`;
        });
        lines.push(portLines.join(',\n'));
        lines.push(');');
    } else {
        lines[lines.length - 1] += ';';
    }

    return lines.join('\n');
}

export function buildVhdlInstantiationSnippet(mod: Module): string {
    const params = mod.parameterList.filter((p: Parameter) => p.kind === 'parameter');
    const ports = mod.ports;

    let tabIndex = 2;
    let snippet = `\${1:u_${mod.name}} : ${mod.name}`;

    if (params.length > 0) {
        snippet += `\n    generic map (\n`;
        snippet += params.map((p: Parameter, i: number) => {
            const val = (p.exprText !== null && p.exprText !== undefined && p.exprText !== '')
                ? p.exprText
                : (p.value !== null ? String(p.value) : p.name.toLowerCase());
            const comma = i < params.length - 1 ? ',' : '';
            return `        ${p.name} => \${${tabIndex++}:${val}}${comma}`;
        }).join('\n');
        snippet += `\n    )`;
    }

    if (ports.length > 0) {
        snippet += `\n    port map (\n`;
        snippet += ports.map((p: Port, i: number) => {
            const comma = i < ports.length - 1 ? ',' : '';
            return `        ${p.name} => \${${tabIndex++}:${p.name.toLowerCase()}}${comma}`;
        }).join('\n');
        snippet += `\n    );`;
    }

    return snippet;
}
