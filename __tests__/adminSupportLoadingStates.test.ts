import fs from "fs";
import path from "path";
import React from "react";
import { act, create } from "react-test-renderer";
import { useRetainedDatedData } from "../hooks/useRetainedDatedData";

const readAdminScreen = (name: string) =>
  fs.readFileSync(
    path.resolve(__dirname, `../screens/Admin/${name}.tsx`),
    "utf8",
  );

const usersSource = readAdminScreen("UsersRolesScreen");
const detailSource = readAdminScreen("UserDetailScreen");
const remindersSource = readAdminScreen("ReminderRulesScreen");

describe("Admin support screen loading states", () => {
  it("keeps the mounted last-successful list when a placeholder key fails", () => {
    type Response = { data: string[]; pagination: { page: number } };
    let params = { page: 1, role: "manager", search: "ali" };
    let response: Response | undefined = {
      data: ["successful"],
      pagination: { page: 1 },
    };
    let isPlaceholderData = false;
    let retained!: ReturnType<
      typeof useRetainedDatedData<{
        response: Response;
        params: typeof params;
      }>
    >;

    const Probe = () => {
      const input = React.useMemo(
        () =>
          !isPlaceholderData && response
            ? { response, params }
            : undefined,
        [params, response],
      );
      retained = useRetainedDatedData(JSON.stringify(params), input);
      return null;
    };

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(React.createElement(Probe));
    });

    params = { page: 4, role: "security", search: "new" };
    isPlaceholderData = true;
    act(() => {
      renderer.update(React.createElement(Probe));
    });
    response = undefined;
    isPlaceholderData = false;
    act(() => {
      renderer.update(React.createElement(Probe));
    });

    expect(retained.data).toEqual({
      response: { data: ["successful"], pagination: { page: 1 } },
      params: { page: 1, role: "manager", search: "ali" },
    });
    expect(retained.isRetained).toBe(true);

    act(() => renderer.unmount());
  });

  it("retains only successful, non-placeholder user-list responses by exact params", () => {
    expect(usersSource).toContain(
      "const usersSourceKey = JSON.stringify(queryParams);",
    );
    expect(usersSource).toContain("!isPlaceholderData && usersResponse");
    expect(usersSource).toContain(
      "useRetainedDatedData(usersSourceKey, retainedInput)",
    );
    expect(usersSource).toContain(
      "const displayedResponse = retainedUsers.data?.response;",
    );
    expect(usersSource).toContain(
      "if ((isLoading || isFetching) && !displayedResponse)",
    );
    expect(usersSource).toContain("if (isError && !displayedResponse)");
    expect(usersSource).toContain(
      't("requests.showingPreviousDataFrom").replace(',
    );
  });

  it("derives list and pagination display from the retained response and source", () => {
    expect(usersSource).toContain("displayedResponse.data.map");
    expect(usersSource).toContain("const pg = displayedResponse?.pagination;");
    expect(usersSource).toContain(
      "displayedResponse?.pagination?.total ?? 0",
    );
    expect(usersSource).toContain(
      "displayedResponse?.pagination?.page ?? displayedQueryParams.page ?? 1",
    );
    expect(usersSource).toContain(
      '`${t("common.page")} ${displayedQueryParams.page ?? 1}`',
    );
    expect(usersSource).toContain("displayedQueryParams.role");
    expect(usersSource).toContain("displayedQueryParams.search");
  });

  it("resets list page in search and role event handlers without an effect", () => {
    expect(usersSource).toMatch(
      /const stableSetSearchQuery[\s\S]*?setCurrentPage\(1\);[\s\S]*?setSearchQuery\(text\);/,
    );
    expect(usersSource).toMatch(
      /const handleRoleFilter[\s\S]*?setCurrentPage\(1\);[\s\S]*?setFilterRole\(role\);/,
    );
    expect(usersSource).not.toContain(
      "useEffect(() => {\n    setCurrentPage(1);\n  }, [filterRole, searchQuery]);",
    );
  });

  it("keeps the grouped list mounted for successful empty responses", () => {
    expect(usersSource).toContain('if (groupBy === "role")');
    expect(usersSource).not.toContain(
      'groupBy === "role" && groupedUsers && groupedUsers.length > 0',
    );
  });

  it("does not expose warm retry actions while a request is already fetching", () => {
    expect(usersSource).toContain("isError && !isFetching ?");
    expect(detailSource).toContain("isError && !isFetching ?");
    expect(remindersSource).toContain("isError && !isFetching ?");
  });

  it("uses the admin detail cache and keeps a cached user mounted", () => {
    expect(detailSource).toContain("useAdminUserQuery(userId)");
    expect(detailSource).not.toContain("useUserQuery(userId)");
    expect(detailSource).toContain(
      "if ((isLoading || isFetching) && !user)",
    );
    expect(detailSource).toContain("if (isError && !user)");
    expect(detailSource).toContain("if (!user)");
    expect(detailSource).toContain("isFetching || isError");
    expect(detailSource).toContain("styles.inlineFeedback");
    expect(detailSource).toContain("onPress={() => refetch()}");
  });

  it("keeps reminder edits during refreshes, failures, and pending saves", () => {
    expect(remindersSource).toContain(
      "data: rules, isLoading, isFetching, isError",
    );
    expect(remindersSource).toContain(
      "rules && !hasChanges && !updateMutation.isPending",
    );
    expect(remindersSource).toContain(
      "[rules, hasChanges, updateMutation.isPending]",
    );
    expect(remindersSource).toContain(
      "if ((isLoading || isFetching) && !localRules)",
    );
    expect(remindersSource).toContain("if (isError && !localRules)");
    expect(remindersSource).toContain(
      "localRules && (isFetching || isError)",
    );
    expect(remindersSource).toContain("onPress={() => refetch()}");
    expect(remindersSource).toContain("const editRevisionRef = useRef(0);");
    expect(remindersSource).toContain(
      "const submittedRevision = editRevisionRef.current;",
    );
    expect(remindersSource).toContain(
      "if (editRevisionRef.current === submittedRevision)",
    );
  });
});