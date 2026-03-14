-module(migration_rollback_SUITE).

-include_lib("common_test/include/ct.hrl").
-include_lib("stdlib/include/assert.hrl").

-compile([export_all, nowarn_export_all]).

%% Replace with your repo module
-define(REPO, my_app_repo).

all() ->
    [test_all_migrations_rollback].

init_per_suite(Config) ->
    {ok, _} = application:ensure_all_started(my_app),
    ok = kura_migrator:migrate(?REPO),
    Config.

end_per_suite(_Config) ->
    ok.

test_all_migrations_rollback(_Config) ->
    %% Get all applied migrations
    Status = kura_migrator:status(?REPO),
    Applied = [V || {V, _M, up} <- Status],
    Total = length(Applied),
    ct:pal("Testing rollback of ~p migrations", [Total]),

    %% Roll back all migrations one at a time, then re-apply
    lists:foreach(
        fun(Version) ->
            {ok, [Version]} = kura_migrator:rollback(?REPO),
            ct:pal("Rolled back migration ~p", [Version])
        end,
        lists:reverse(Applied)
    ),

    %% Verify all rolled back
    StatusAfter = kura_migrator:status(?REPO),
    ?assertEqual([], [V || {V, _M, up} <- StatusAfter]),

    %% Re-apply all
    {ok, Reapplied} = kura_migrator:migrate(?REPO),
    ?assertEqual(Total, length(Reapplied)),
    ct:pal("Re-applied ~p migrations successfully", [Total]).
