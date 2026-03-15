-module(fixture_tests).

-include_lib("eunit/include/eunit.hrl").

hello_test() ->
    ?assertEqual(world, fixture:hello()).
