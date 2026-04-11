// Ambient type declarations for the antlr4 npm package (which ships no built-in .d.ts).
// These minimal declarations cover the subset of the public API used by the generated
// lexer/parser .d.ts files (antlr/generated/*.d.ts) and by the hand-written visitor
// classes in verilog-parser.ts and vhdl-parser.ts.

declare module 'antlr4' {
    export class InputStream {
        constructor(data: string, decodeToUnicodeCodePoints?: boolean);
    }

    export class Lexer {
        constructor(input: InputStream);
    }

    export class CommonTokenStream {
        constructor(lexer: Lexer, channel?: number);
        seek(index: number): void;
    }

    export class ParserRuleContext {
        start: Token;
        stop: Token;
        getText(): string;
    }

    export class Token {
        readonly line: number;
        readonly column: number;
        readonly text: string;
        readonly type: number;
    }

    export class Parser {
        constructor(input: CommonTokenStream);
        removeErrorListeners(): void;
        addErrorListener(listener: error.ErrorListener): void;
        reset(): void;
        _interp: { predictionMode: number };
    }

    export namespace atn {
        const PredictionMode: { SLL: number; LL: number; LL_EXACT_AMBIG_DETECTION: number };
    }

    export namespace error {
        class ErrorListener {
            syntaxError(
                recognizer: any,
                offendingSymbol: any,
                line: number,
                column: number,
                msg: string,
                e: any
            ): void;
        }
    }

    const antlr4: {
        InputStream: typeof InputStream;
        CommonTokenStream: typeof CommonTokenStream;
        Lexer: typeof Lexer;
        Parser: typeof Parser;
        error: typeof error;
        atn: typeof atn;
    };
    export default antlr4;
}

declare module 'antlr4/tree/ParseTreeVisitor' {
    export default class ParseTreeVisitor {
        visit(ctx: any): any;
        visitChildren(ctx: any): any;
    }
}

declare module 'antlr4/tree/Tree' {
    import { Token } from 'antlr4';
    export class TerminalNode {
        symbol: Token;
        getText(): string;
    }
}
