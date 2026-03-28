library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity counter is
    generic (
        WIDTH : integer := 8
    );
    port (
        clk       : in  std_logic;
        reset     : in  std_logic;
        count_in  : in  std_logic_vector(WIDTH-1 downto 0);
        count_out : out std_logic_vector(WIDTH-1 downto 0)
    );
end entity counter;

architecture rtl of counter is
    signal count_reg : std_logic_vector(WIDTH-1 downto 0);
begin
    process(clk)
    begin
        if rising_edge(clk) then
            if reset = '1' then
                count_reg <= (others => '0');
            else
                count_reg <= std_logic_vector(unsigned(count_in) + 1);
            end if;
        end if;
    end process;
    count_out <= count_reg;
end architecture rtl;
