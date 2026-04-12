library ieee;
use ieee.std_logic_1164.all;

-- Entity with a mix of port types to exercise bitRange parsing.
entity test_bitwidth is
    generic (
        WIDTH : integer := 8
    );
    port (
        clk      : in  std_logic;                         -- scalar: bitRange null
        data_in  : in  std_logic_vector(7 downto 0);      -- numeric downto: [7:0]
        data_out : out std_logic_vector(3 downto 0);      -- numeric downto: [3:0]
        bus_io   : inout std_logic_vector(0 to 3);        -- numeric to:     [3:0]
        dyn_in   : in  std_logic_vector(WIDTH-1 downto 0) -- expression-based
    );
end entity test_bitwidth;

architecture rtl of test_bitwidth is
begin
end architecture rtl;
