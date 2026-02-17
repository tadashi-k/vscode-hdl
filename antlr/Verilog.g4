grammar Verilog;

// Parser Rules

// Top-level source text
source_text
    : description* EOF
    ;

description
    : module_declaration
    ;

// Module Declaration
module_declaration
    : MODULE module_identifier parameter_port_list? list_of_ports? ';'
      module_item*
      ENDMODULE
    ;

module_identifier
    : identifier
    ;

parameter_port_list
    : '#' '(' parameter_declaration (',' parameter_declaration)* ')'
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
    : port_identifier ('[' constant_range_expression ']')?
    ;

port_identifier
    : identifier
    ;

// Module Items
module_item
    : port_declaration
    | parameter_declaration
    | net_declaration
    | reg_declaration
    | integer_declaration
    | continuous_assign
    | module_instantiation
    | always_construct
    | initial_construct
    ;

// Port Declarations
port_declaration
    : input_declaration
    | output_declaration
    | inout_declaration
    ;

input_declaration
    : INPUT net_type? range? list_of_port_identifiers ';'
    ;

output_declaration
    : OUTPUT net_type? range? list_of_port_identifiers ';'
    ;

inout_declaration
    : INOUT net_type? range? list_of_port_identifiers ';'
    ;

// Parameter Declarations
parameter_declaration
    : PARAMETER range? list_of_param_assignments ';'
    ;

list_of_param_assignments
    : param_assignment (',' param_assignment)*
    ;

param_assignment
    : parameter_identifier '=' constant_expression
    ;

parameter_identifier
    : identifier
    ;

// Net Declarations
net_declaration
    : net_type range? delay? list_of_net_identifiers ';'
    ;

net_type
    : WIRE
    | TRI
    | SUPPLY0
    | SUPPLY1
    ;

delay
    : '#' delay_value
    ;

delay_value
    : unsigned_number
    | parameter_identifier
    ;

list_of_net_identifiers
    : net_identifier (',' net_identifier)*
    ;

net_identifier
    : identifier
    ;

// Register Declarations
reg_declaration
    : REG range? list_of_register_identifiers ';'
    ;

list_of_register_identifiers
    : register_identifier ('=' constant_expression)? (',' register_identifier ('=' constant_expression)?)*
    ;

register_identifier
    : identifier
    ;

// Integer Declarations
integer_declaration
    : INTEGER list_of_register_identifiers ';'
    ;

// Continuous Assignment
continuous_assign
    : ASSIGN assignment_list ';'
    ;

assignment_list
    : assignment (',' assignment)*
    ;

assignment
    : lvalue '=' expression
    ;

// Module Instantiation
module_instantiation
    : module_identifier parameter_value_assignment? module_instance (',' module_instance)* ';'
    ;

parameter_value_assignment
    : '#' '(' expression (',' expression)* ')'
    ;

module_instance
    : name_of_instance '(' list_of_port_connections? ')'
    ;

name_of_instance
    : identifier range?
    ;

list_of_port_connections
    : ordered_port_connection (',' ordered_port_connection)*
    | named_port_connection (',' named_port_connection)*
    ;

ordered_port_connection
    : expression
    | /* empty - represented by omitting this alternative in list */
    ;

named_port_connection
    : '.' port_identifier '(' expression? ')'
    ;

// Always Construct
always_construct
    : ALWAYS statement
    ;

// Initial Construct
initial_construct
    : INITIAL statement
    ;

// Statements
statement
    : blocking_assignment
    | non_blocking_assignment
    | procedural_continuous_assignment
    | conditional_statement
    | case_statement
    | loop_statement
    | seq_block
    | event_statement
    | ';'
    ;

statement_or_null
    : statement
    ;

blocking_assignment
    : lvalue '=' delay_or_event_control? expression ';'
    ;

non_blocking_assignment
    : lvalue '<=' delay_or_event_control? expression ';'
    ;

procedural_continuous_assignment
    : ASSIGN assignment ';'
    | DEASSIGN lvalue ';'
    ;

conditional_statement
    : IF '(' expression ')' statement_or_null (ELSE statement_or_null)?
    ;

case_statement
    : CASE '(' expression ')' case_item+ ENDCASE
    | CASEZ '(' expression ')' case_item+ ENDCASE
    | CASEX '(' expression ')' case_item+ ENDCASE
    ;

case_item
    : expression (',' expression)* ':' statement_or_null
    | DEFAULT ':' statement_or_null
    ;

loop_statement
    : FOR '(' assignment ';' expression ';' assignment ')' statement
    | WHILE '(' expression ')' statement
    | REPEAT '(' expression ')' statement
    ;

seq_block
    : BEGIN (':'  block_identifier)? block_item_declaration* statement* END
    ;

block_identifier
    : identifier
    ;

block_item_declaration
    : parameter_declaration
    | reg_declaration
    | integer_declaration
    ;

event_statement
    : event_control statement_or_null
    ;

event_control
    : '@' event_identifier
    | '@' '(' event_expression ')'
    ;

event_identifier
    : identifier
    ;

event_expression
    : expression
    | POSEDGE expression
    | NEGEDGE expression
    | event_expression OR event_expression
    ;

delay_or_event_control
    : delay_control
    | event_control
    ;

delay_control
    : '#' delay_value
    ;

// Expressions
expression
    : primary
    | unary_operator primary
    | expression binary_operator expression
    | expression '?' expression ':' expression
    | STRING
    ;

primary
    : number
    | identifier ('[' expression ']')? ('[' range_expression ']')?
    | concatenation
    | multiple_concatenation
    | '(' expression ')'
    ;

lvalue
    : identifier ('[' expression ']')?
    | concatenation
    ;

concatenation
    : '{' expression (',' expression)* '}'
    ;

multiple_concatenation
    : '{' expression concatenation '}'
    ;

list_of_port_identifiers
    : port_identifier (',' port_identifier)*
    ;

range
    : '[' constant_expression ':' constant_expression ']'
    ;

range_expression
    : expression ':' expression
    ;

constant_range_expression
    : constant_expression ':' constant_expression
    ;

constant_expression
    : expression
    ;

unary_operator
    : '+'
    | '-'
    | '!'
    | '~'
    | '&'
    | '|'
    | '^'
    | NAND
    | NOR
    ;

binary_operator
    : '+'
    | '-'
    | '*'
    | '/'
    | '%'
    | EQ
    | NE
    | CEQ
    | CNE
    | LAND
    | LOR
    | '<'
    | '>'
    | LE
    | GE
    | '&'
    | '|'
    | '^'
    | NAND
    | NOR
    | SL
    | SR
    | ASL
    | ASR
    ;

number
    : DECIMAL_NUMBER
    | OCTAL_NUMBER
    | BINARY_NUMBER
    | HEX_NUMBER
    | REAL_NUMBER
    | unsigned_number
    ;

unsigned_number
    : UNSIGNED_NUMBER
    ;

identifier
    : SIMPLE_IDENTIFIER
    | ESCAPED_IDENTIFIER
    ;

// Lexer Rules

// Keywords
MODULE      : 'module';
ENDMODULE   : 'endmodule';
INPUT       : 'input';
OUTPUT      : 'output';
INOUT       : 'inout';
WIRE        : 'wire';
REG         : 'reg';
TRI         : 'tri';
SUPPLY0     : 'supply0';
SUPPLY1     : 'supply1';
PARAMETER   : 'parameter';
INTEGER     : 'integer';
ASSIGN      : 'assign';
DEASSIGN    : 'deassign';
ALWAYS      : 'always';
INITIAL     : 'initial';
BEGIN       : 'begin';
END         : 'end';
IF          : 'if';
ELSE        : 'else';
CASE        : 'case';
CASEZ       : 'casez';
CASEX       : 'casex';
ENDCASE     : 'endcase';
DEFAULT     : 'default';
FOR         : 'for';
WHILE       : 'while';
REPEAT      : 'repeat';
POSEDGE     : 'posedge';
NEGEDGE     : 'negedge';
OR          : 'or';

// Operators
EQ      : '==';
NE      : '!=';
CEQ     : '===';
CNE     : '!==';
LAND    : '&&';
LOR     : '||';
LE      : '<=';
GE      : '>=';
SL      : '<<';
SR      : '>>';
ASL     : '<<<';
ASR     : '>>>';
NAND    : '~&';
NOR     : '~|';

// Identifiers
SIMPLE_IDENTIFIER
    : [a-zA-Z_] [a-zA-Z0-9_$]*
    ;

ESCAPED_IDENTIFIER
    : '\\' ~[ \t\r\n]+ [ \t]
    ;

// Numbers
UNSIGNED_NUMBER
    : [0-9]+
    ;

DECIMAL_NUMBER
    : [0-9]* [']? [sS]? [dD] [0-9_]+
    ;

BINARY_NUMBER
    : [0-9]* [']? [sS]? [bB] [01_xXzZ?]+
    ;

OCTAL_NUMBER
    : [0-9]* [']? [sS]? [oO] [0-7_xXzZ?]+
    ;

HEX_NUMBER
    : [0-9]* [']? [sS]? [hH] [0-9a-fA-F_xXzZ?]+
    ;

REAL_NUMBER
    : [0-9]+ '.' [0-9]+ ([eE] [+-]? [0-9]+)?
    | [0-9]+ [eE] [+-]? [0-9]+
    ;

// String
STRING
    : '"' (~["\r\n\\] | '\\' .)* '"'
    ;

// Whitespace and Comments
WS
    : [ \t\r\n]+ -> skip
    ;

COMMENT
    : '//' ~[\r\n]* -> skip
    ;

BLOCK_COMMENT
    : '/*' .*? '*/' -> skip
    ;
