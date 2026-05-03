-- VHDL Adder Module
-- N-bit carry-ripple adder with carry-in and carry-out

library IEEE;
use IEEE.std_logic_1164.all;
use IEEE.numeric_std.all;

entity adder_vhdl is
    generic (
        WIDTH : positive := 8
    );
    port (
        a      : in  std_logic_vector(WIDTH-1 downto 0);
        b      : in  std_logic_vector(WIDTH-1 downto 0);
        cin    : in  std_logic;
        sum    : out std_logic_vector(WIDTH-1 downto 0);
        cout   : out std_logic
    );
end entity adder_vhdl;

architecture rtl of adder_vhdl is
    signal result : std_logic_vector(WIDTH downto 0);
begin
    result <= std_logic_vector(unsigned('0' & a) + unsigned('0' & b) + unsigned'(0 => cin));
    
    sum  <= result(WIDTH-1 downto 0);
    cout <= result(WIDTH);
    
end architecture rtl;
