grammar Verilog;

// Parser Rules
source_text
    : description* EOF
    ;

description
    : module_declaration
    ;

module_declaration
    : 'module' module_identifier list_of_ports? ';' module_item* 'endmodule'
    | 'module' module_identifier '(' ansi_port_declaration (',' ansi_port_declaration)* ')' ';' module_item* 'endmodule'
    | 'module' module_identifier '(' ')' ';' module_item* 'endmodule'
    ;

module_identifier
    : IDENTIFIER
    ;

list_of_ports
    : '(' port (',' port)* ')'
    ;

port
    : port_expression?
    | '.' port_identifier '(' port_expression? ')'
    ;

port_expression
    : port_reference
    | '{' port_reference (',' port_reference)* '}'
    ;

port_reference
    : port_identifier constant_range_expression?
    ;

port_identifier
    : IDENTIFIER
    ;

ansi_port_declaration
    : input_declaration_ansi
    | output_declaration_ansi
    | inout_declaration_ansi
    ;

input_declaration_ansi
    : 'input' net_type? range? port_identifier
    ;

output_declaration_ansi
    : 'output' net_type? range? port_identifier
    | 'output' 'reg' range? port_identifier
    ;

inout_declaration_ansi
    : 'inout' net_type? range? port_identifier
    ;

constant_range_expression
    : constant_expression
    | constant_expression ':' constant_expression
    ;

module_item
    : port_declaration
    | net_declaration
    | reg_declaration
    | parameter_declaration
    | continuous_assign
    | initial_construct
    | always_construct
    ;

port_declaration
    : input_declaration
    | output_declaration
    | inout_declaration
    ;

input_declaration
    : 'input' net_type? range? list_of_port_identifiers ';'
    ;

output_declaration
    : 'output' net_type? range? list_of_port_identifiers ';'
    | 'output' 'reg' range? list_of_port_identifiers ';'
    ;

inout_declaration
    : 'inout' net_type? range? list_of_port_identifiers ';'
    ;

net_declaration
    : net_type range? list_of_net_identifiers ';'
    ;

reg_declaration
    : 'reg' range? list_of_register_identifiers ';'
    ;

net_type
    : 'wire'
    | 'tri'
    | 'supply0'
    | 'supply1'
    ;

range
    : '[' constant_expression ':' constant_expression ']'
    ;

list_of_port_identifiers
    : port_identifier (',' port_identifier)*
    ;

list_of_net_identifiers
    : net_identifier (',' net_identifier)*
    ;

list_of_register_identifiers
    : register_identifier (',' register_identifier)*
    ;

net_identifier
    : IDENTIFIER
    ;

register_identifier
    : IDENTIFIER
    ;

parameter_declaration
    : 'parameter' list_of_param_assignments ';'
    ;

list_of_param_assignments
    : param_assignment (',' param_assignment)*
    ;

param_assignment
    : parameter_identifier '=' constant_expression
    ;

parameter_identifier
    : IDENTIFIER
    ;

continuous_assign
    : 'assign' list_of_net_assignments ';'
    ;

list_of_net_assignments
    : net_assignment (',' net_assignment)*
    ;

net_assignment
    : net_lvalue '=' expression
    ;

initial_construct
    : 'initial' statement
    ;

always_construct
    : 'always' '@' '(' event_expression ')' statement
    ;

event_expression
    : expression
    | 'posedge' expression
    | 'negedge' expression
    | event_expression 'or' event_expression
    ;

statement
    : blocking_assignment ';'
    | non_blocking_assignment ';'
    | seq_block
    | conditional_statement
    | case_statement
    | ';'
    ;

seq_block
    : 'begin' statement* 'end'
    ;

blocking_assignment
    : variable_lvalue '=' expression
    ;

non_blocking_assignment
    : variable_lvalue '<=' expression
    ;

conditional_statement
    : 'if' '(' expression ')' statement ('else' statement)?
    ;

case_statement
    : 'case' '(' expression ')' case_item+ 'endcase'
    ;

case_item
    : expression (',' expression)* ':' statement
    | 'default' ':' statement
    ;

net_lvalue
    : IDENTIFIER
    | IDENTIFIER '[' expression ']'
    | IDENTIFIER '[' expression ':' expression ']'
    ;

variable_lvalue
    : IDENTIFIER
    | IDENTIFIER '[' expression ']'
    | IDENTIFIER '[' expression ':' expression ']'
    ;

constant_expression
    : expression
    ;

expression
    : primary
    | unary_operator expression
    | expression binary_operator expression
    | expression '?' expression ':' expression
    | '(' expression ')'
    ;

primary
    : NUMBER
    | IDENTIFIER
    | IDENTIFIER '[' expression ']'
    | IDENTIFIER '[' expression ':' expression ']'
    | concatenation
    | multiple_concatenation
    ;

concatenation
    : '{' expression (',' expression)* '}'
    ;

multiple_concatenation
    : '{' expression concatenation '}'
    ;

unary_operator
    : '+'
    | '-'
    | '!'
    | '~'
    | '&'
    | '|'
    | '^'
    ;

binary_operator
    : '+'
    | '-'
    | '*'
    | '/'
    | '%'
    | '=='
    | '!='
    | '==='
    | '!=='
    | '&&'
    | '||'
    | '<'
    | '<='
    | '>'
    | '>='
    | '&'
    | '|'
    | '^'
    | '~^'
    | '^~'
    | '<<'
    | '>>'
    ;

// Lexer Rules
IDENTIFIER
    : [a-zA-Z_][a-zA-Z_0-9]*
    ;

NUMBER
    : DECIMAL_NUMBER
    | BASED_NUMBER
    ;

DECIMAL_NUMBER
    : [0-9]+
    ;

BASED_NUMBER
    : [0-9]* '\'' [bBoOdDhH] [0-9a-fA-FxXzZ?_]+
    ;

WHITESPACE
    : [ \t\r\n]+ -> skip
    ;

COMMENT
    : '//' ~[\r\n]* -> skip
    ;

BLOCK_COMMENT
    : '/*' .*? '*/' -> skip
    ;
