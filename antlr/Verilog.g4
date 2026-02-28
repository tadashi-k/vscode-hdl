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
    | ansi_port_declaration
    ;

// ANSI-style port declaration (e.g., input wire clk, output reg [7:0] data)
ansi_port_declaration
    : port_direction port_data_type? range? port_identifier
    ;

// Data type for ports (can be net types or reg)
port_data_type
    : net_type
    | REG
    ;

port_direction
    : INPUT
    | OUTPUT
    | INOUT
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
    | parameter_declaration ';'
    | local_parameter_declaration
    | net_declaration
    | reg_declaration
    | integer_declaration
    | genvar_declaration
    | continuous_assign
    | module_instantiation
    | always_construct
    | initial_construct
    | generate_block
    | task_declaration
    | function_declaration
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
    : PARAMETER (parameter_data_type | range)? list_of_param_assignments
    ;

local_parameter_declaration
    : LOCALPARAM (parameter_data_type | range)? list_of_param_assignments ';'
    ;

parameter_data_type
    : INTEGER
    | REAL
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
    | '(' constant_expression ')'
    ;

list_of_net_identifiers
    : net_identifier range? ('=' expression)? (',' net_identifier range? ('=' expression)? )*
    ;

net_identifier
    : identifier
    ;

// Register Declarations
reg_declaration
    : REG range? list_of_register_identifiers ';'
    ;

list_of_register_identifiers
    : register_identifier range? ('=' constant_expression)? (',' register_identifier range? ('=' constant_expression)?)*
    ;

register_identifier
    : identifier
    ;

// Integer Declarations
integer_declaration
    : INTEGER list_of_register_identifiers ';'
    ;

// Genvar Declaration
genvar_declaration
    : GENVAR list_of_genvar_identifiers ';'
    ;

list_of_genvar_identifiers
    : genvar_identifier (',' genvar_identifier)*
    ;

genvar_identifier
    : identifier
    ;

// Generate Block
generate_block
    : GENERATE generate_item* ENDGENERATE
    ;

generate_item
    : generate_conditional_statement
    | generate_loop_statement
    | net_declaration
    | reg_declaration
    | integer_declaration
    | genvar_declaration
    | continuous_assign
    | module_instantiation
    | always_construct
    | initial_construct
    | parameter_declaration ';'
    | local_parameter_declaration
    ;

generate_conditional_statement
    : IF '(' constant_expression ')' generate_item_or_block (ELSE generate_item_or_block)?
    ;

generate_loop_statement
    : FOR '(' genvar_assignment ';' constant_expression ';' genvar_assignment ')' generate_item_or_block
    ;

genvar_assignment
    : genvar_identifier '=' constant_expression
    ;

generate_item_or_block
    : generate_item
    | BEGIN (':' block_identifier)? generate_item* END
    ;

// Task Declaration
task_declaration
    : TASK task_identifier ';'
      task_item_declaration*
      statement_or_null
      ENDTASK
    ;

task_identifier
    : identifier
    ;

task_item_declaration
    : block_item_declaration
    | tf_input_declaration ';'
    | tf_output_declaration ';'
    | tf_inout_declaration ';'
    ;

tf_input_declaration
    : INPUT range? list_of_port_identifiers
    ;

tf_output_declaration
    : OUTPUT range? list_of_port_identifiers
    ;

tf_inout_declaration
    : INOUT range? list_of_port_identifiers
    ;

// Function Declaration
function_declaration
    : FUNCTION range_or_type? function_identifier ';'
      function_item_declaration+
      statement
      ENDFUNCTION
    ;

function_identifier
    : identifier
    ;

range_or_type
    : range
    | INTEGER
    ;

function_item_declaration
    : block_item_declaration
    | tf_input_declaration ';'
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
    | '#' '(' named_parameter_assignment(',' named_parameter_assignment)* ')'
    ;

named_parameter_assignment
    :  '.' parameter_identifier '(' expression ')'
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
    | par_block
    | event_statement
    | delay_or_event_control statement_or_null
    | task_enable
    | system_task_enable
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
    | FOREVER statement
    ;

seq_block
    : BEGIN (':'  block_identifier)? block_item_declaration* statement* END
    ;

par_block
    : FORK (':' block_identifier)? block_item_declaration* statement* JOIN
    ;

// Task Enable
task_enable
    : task_identifier ('(' expression (',' expression)* ')')? ';'
    ;

// System Task Enable
system_task_enable
    : SYSTEM_TASK_IDENTIFIER ('(' expression (',' expression)* ')')? ';'
    ;

block_identifier
    : identifier
    ;

block_item_declaration
    : parameter_declaration
    | local_parameter_declaration
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
    | identifier '(' expression (',' expression)* ')'
    | identifier '[' expression ']' ('[' expression ((':' | '+:' | '-:') expression)? ']')?
    | identifier '[' range_expression ']'
    | identifier
    | concatenation
    | multiple_concatenation
    | '(' expression ')'
    ;

lvalue
    : identifier '[' expression ']' ('[' expression ((':' | '+:' | '-:') expression)? ']')?
    | identifier '[' range_expression ']'
    | identifier
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
    : '[' constant_expression (':' | '+:' | '-:') constant_expression ']'
    ;

range_expression
    : expression (':' | '+:' | '-:') expression
    ;

constant_range_expression
    : constant_expression (':' | '+:' | '-:') constant_expression
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
    | POW
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
LOCALPARAM  : 'localparam';
INTEGER     : 'integer';
REAL        : 'real';
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
FOREVER     : 'forever';
WHILE       : 'while';
REPEAT      : 'repeat';
POSEDGE     : 'posedge';
NEGEDGE     : 'negedge';
OR          : 'or';
GENERATE    : 'generate';
ENDGENERATE : 'endgenerate';
GENVAR      : 'genvar';
TASK        : 'task';
ENDTASK     : 'endtask';
FUNCTION    : 'function';
ENDFUNCTION : 'endfunction';
FORK        : 'fork';
JOIN        : 'join';

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
POW     : '**';

// Identifiers
SIMPLE_IDENTIFIER
    : [a-zA-Z_] [a-zA-Z0-9_$]*
    ;

ESCAPED_IDENTIFIER
    : '\\' ~[ \t\r\n]+ [ \t]
    ;

SYSTEM_TASK_IDENTIFIER
    : '$' [a-zA-Z_] [a-zA-Z0-9_$]*
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

DIRECTIVE_COMMENT
    : '(*' .*? '*)' -> skip
    ;
