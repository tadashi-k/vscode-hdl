-- Top Level Mixed VHDL/Verilog System
-- Demonstrates instantiation of both VHDL and Verilog modules

library IEEE;
use IEEE.std_logic_1164.all;
use IEEE.numeric_std.all;

entity mixed_system_top is
    generic (
        DATA_WIDTH : positive := 8
    );
    port (
        clk      : in  std_logic;
        rst_n    : in  std_logic;
        enable   : in  std_logic;
        data_a   : in  std_logic_vector(DATA_WIDTH-1 downto 0);
        data_b   : in  std_logic_vector(DATA_WIDTH-1 downto 0);
        sel      : in  std_logic_vector(2 downto 0);
        result   : out std_logic_vector(DATA_WIDTH-1 downto 0);
        carry    : out std_logic;
        counter  : out std_logic_vector(DATA_WIDTH-1 downto 0)
    );
end entity mixed_system_top;

architecture rtl of mixed_system_top is
    
    -- Verilog module instantiation
    component counter_verilog is
        generic (WIDTH : positive);
        port (
            clk       : in  std_logic;
            rst_n     : in  std_logic;
            enable    : in  std_logic;
            load_value: in  std_logic_vector(WIDTH-1 downto 0);
            load      : in  std_logic;
            count     : out std_logic_vector(WIDTH-1 downto 0)
        );
    end component;
    
    -- VHDL module instantiation
    component adder_vhdl is
        generic (WIDTH : positive);
        port (
            a    : in  std_logic_vector(WIDTH-1 downto 0);
            b    : in  std_logic_vector(WIDTH-1 downto 0);
            cin  : in  std_logic;
            sum  : out std_logic_vector(WIDTH-1 downto 0);
            cout : out std_logic
        );
    end component;
    
    signal counter_val   : std_logic_vector(DATA_WIDTH-1 downto 0);
    signal adder_sum     : std_logic_vector(DATA_WIDTH-1 downto 0);
    signal adder_carry   : std_logic;
    
begin
    
    -- Instantiate Verilog counter
    u_counter : counter_verilog
        generic map (WIDTH => DATA_WIDTH)
        port map (
            clk        => clk,
            rst_n      => rst_n,
            enable     => enable,
            load_value => data_a,
            load       => sel(0),
            count      => counter_val
        );
    
    -- Instantiate VHDL adder
    u_adder : adder_vhdl
        generic map (WIDTH => DATA_WIDTH)
        port map (
            a    => counter_val,
            b    => data_b,
            cin  => sel(1),
            sum  => adder_sum,
            cout => adder_carry
        );
    
    result  <= adder_sum;
    carry   <= adder_carry;
    counter <= counter_val;
    
end architecture rtl;
