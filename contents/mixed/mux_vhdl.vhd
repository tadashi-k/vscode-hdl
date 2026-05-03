-- VHDL Multiplexer Module
-- N:1 multiplexer with parallel inputs

library IEEE;
use IEEE.std_logic_1164.all;
use IEEE.numeric_std.all;
use IEEE.math_real.all;

entity mux_vhdl is
    generic (
        WIDTH : positive := 8;
        INPUTS : positive := 4
    );
    port (
        data_in  : in  std_logic_vector(INPUTS * WIDTH - 1 downto 0);
        addr     : in  std_logic_vector(integer(ceil(log2(real(INPUTS)))) - 1 downto 0);
        data_out : out std_logic_vector(WIDTH - 1 downto 0)
    );
end entity mux_vhdl;

architecture rtl of mux_vhdl is
begin
    
    process(data_in, addr)
        variable sel_idx : integer;
    begin
        sel_idx := to_integer(unsigned(addr));
        if sel_idx < INPUTS then
            data_out <= data_in((sel_idx + 1) * WIDTH - 1 downto sel_idx * WIDTH);
        else
            data_out <= (others => '0');
        end if;
    end process;
    
end architecture rtl;
