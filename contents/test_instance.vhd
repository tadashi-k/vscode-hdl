library ieee;
use ieee.std_logic_1164.all;

entity test_instance is
    port (
        clk   : in  std_logic;
        reset : in  std_logic;
        q     : out std_logic_vector(7 downto 0)
    );
end entity test_instance;

architecture rtl of test_instance is
    component counter is
        generic (WIDTH : integer := 8);
        port (
            clk       : in  std_logic;
            reset     : in  std_logic;
            count_in  : in  std_logic_vector(WIDTH-1 downto 0);
            count_out : out std_logic_vector(WIDTH-1 downto 0)
        );
    end component;

    signal cnt_in : std_logic_vector(7 downto 0);
begin
    u_counter : counter
        generic map (WIDTH => 8)
        port map (
            clk       => clk,
            reset     => reset,
            count_in  => cnt_in,
            count_out => q
        );
end architecture rtl;
