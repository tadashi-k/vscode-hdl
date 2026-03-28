library ieee;
use ieee.std_logic_1164.all;

entity test_entity is
    generic (
        DATA_WIDTH : integer := 8;
        ADDR_WIDTH : integer := 4
    );
    port (
        clk      : in    std_logic;
        reset    : in    std_logic;
        data_in  : in    std_logic_vector(DATA_WIDTH-1 downto 0);
        data_out : out   std_logic_vector(DATA_WIDTH-1 downto 0);
        addr     : inout std_logic_vector(ADDR_WIDTH-1 downto 0)
    );
end entity test_entity;

architecture rtl of test_entity is
    signal   buf_reg  : std_logic_vector(DATA_WIDTH-1 downto 0);
    constant IDLE     : std_logic_vector(1 downto 0) := "00";
begin
    process(clk)
    begin
        if rising_edge(clk) then
            if reset = '1' then
                buf_reg <= (others => '0');
            else
                buf_reg <= data_in;
            end if;
        end if;
    end process;
    data_out <= buf_reg;
end architecture rtl;
