-- VHDL-2008 bit-string literal test file.
-- Exercises size-prefixed and modifier-prefixed bit-string literals.
library ieee;
use ieee.std_logic_1164.all;

entity test_hex_literal is
    generic (
        MASK    : std_logic_vector(7 downto 0)  := 8x"FF";
        INIT    : std_logic_vector(3 downto 0)  := 4b"1010";
        OCT_DEF : std_logic_vector(5 downto 0)  := 6o"17"
    );
    port (
        clk  : in  std_logic;
        din  : in  std_logic_vector(7 downto 0);
        dout : out std_logic_vector(7 downto 0)
    );
end entity test_hex_literal;

architecture rtl of test_hex_literal is
    constant MAX16  : std_logic_vector(15 downto 0) := 16x"ABCD";
    constant UHX    : std_logic_vector(11 downto 0) := 12ux"FAB";
    constant SHX    : std_logic_vector(7 downto 0)  := 8sx"7F";
    constant BIN4   : std_logic_vector(3 downto 0)  := 4b"1100";
    constant OCT6   : std_logic_vector(5 downto 0)  := 6o"37";
begin
    process(clk)
    begin
        if rising_edge(clk) then
            if din = 8x"00" then
                dout <= 8x"FF";
            elsif din = 8ux"80" then
                dout <= 8sx"7F";
            else
                dout <= din and MASK;
            end if;
        end if;
    end process;
end architecture rtl;
