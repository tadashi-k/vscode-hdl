library ieee;
use ieee.std_logic_1164.all;

-- VHDL-W1: signal declared but never read
entity warn_w1 is
    port (clk : in std_logic; q : out std_logic);
end entity;
architecture rtl of warn_w1 is
    signal never_used : std_logic;
begin
    q <= clk;
end architecture;

-- VHDL-W2: input port used as l-value
entity warn_w2 is
    port (clk : in std_logic; q : out std_logic);
end entity;
architecture rtl of warn_w2 is
begin
    clk <= '0';
    q   <= clk;
end architecture;

-- VHDL-W3: signal never assigned
entity warn_w3 is
    port (clk : in std_logic; q : out std_logic);
end entity;
architecture rtl of warn_w3 is
    signal never_assigned : std_logic;
begin
    q <= never_assigned;
end architecture;

-- VHDL-W4: missing port in named connection
entity submod_w4 is
    port (a : in std_logic; b : in std_logic; c : out std_logic);
end entity;
architecture rtl of submod_w4 is
begin
    c <= a and b;
end architecture;

entity warn_w4 is
    port (x : in std_logic; y : out std_logic);
end entity;
architecture rtl of warn_w4 is
    component submod_w4 is
        port (a : in std_logic; b : in std_logic; c : out std_logic);
    end component;
begin
    u1 : submod_w4 port map (a => x, c => y);
end architecture;

-- VHDL-W5: instantiated entity not found in database
entity warn_w5 is
    port (x : in std_logic; y : out std_logic);
end entity;
architecture rtl of warn_w5 is
    component nonexistent_entity is
        port (a : in std_logic; z : out std_logic);
    end component;
begin
    u1 : nonexistent_entity port map (a => x, z => y);
end architecture;
