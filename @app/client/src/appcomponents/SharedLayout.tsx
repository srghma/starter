"use client";
import { CrownOutlined, DownOutlined } from "@ant-design/icons";
import { ApolloError, QueryResult, useApolloClient } from "@apollo/client";
import { companyName, projectName } from "@app/config";
import {
  SharedLayout_QueryFragment,
  SharedLayout_UserFragment,
  useCurrentUserUpdatedSubscription,
  useLogoutMutation,
} from "@/appgraphqlgenerated";
import { Avatar, Col, Dropdown, Layout, Menu, Row, Typography } from "antd";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useCallback } from "react";

import { ErrorAlert, H3, StandardWidth, Warn } from ".";
import { Redirect } from "./Redirect";
import { useFullHref } from "./useFullHref";

const { Header, Content, Footer } = Layout;
const { Text } = Typography;
/*
 * For some reason, possibly related to the interaction between
 * `babel-plugin-import` and https://github.com/babel/babel/pull/9766, we can't
 * directly export these values, but if we reference them and re-export then we
 * can.
 *
 * TODO: change back to `export { Row, Col, Link }` when this issue is fixed.
 */
const _babelHackRow = Row;
const _babelHackCol = Col;
export { _babelHackCol as Col, Link, _babelHackRow as Row };

export const contentMinHeight = "calc(100vh - 64px - 70px)";

export interface SharedLayoutChildProps {
  error?: ApolloError | Error;
  loading: boolean;
  currentUser?: SharedLayout_UserFragment | null;
}

export enum AuthRestrict {
  NEVER = 0,
  LOGGED_OUT = 1 << 0,
  LOGGED_IN = 1 << 1,
  NOT_ADMIN = 1 << 2,
}

export interface SharedLayoutProps {
  /*
   * We're expecting lots of different queries to be passed through here, and
   * for them to have this common required data we need. Methods like
   * `subscribeToMore` are too specific (and we don't need them) so we're going
   * to drop them from the data requirements.
   *
   * NOTE: we're not fetching this query internally because we want the entire
   * page to be fetchable via a single GraphQL query, rather than multiple
   * chained queries.
   */
  query: Pick<
    QueryResult<SharedLayout_QueryFragment>,
    "data" | "loading" | "error" | "networkStatus" | "client" | "refetch"
  >;

  title: string;
  titleHref?: string;
  titleHrefAs?: string;
  children:
  | React.ReactNode
  | ((props: SharedLayoutChildProps) => React.ReactNode);
  noPad?: boolean;
  noHandleErrors?: boolean;
  forbidWhen?: AuthRestrict;
}

/* The Apollo `useSubscription` hook doesn't currently allow skipping the
 * subscription; we only want it when the user is logged in, so we conditionally
 * call this stub component.
 */
function CurrentUserUpdatedSubscription() {
  /*
   * This will set up a GraphQL subscription monitoring for changes to the
   * current user. Interestingly we don't need to actually _do_ anything - no
   * rendering or similar - because the payload of this mutation will
   * automatically update Apollo's cache which will cause the data to be
   * re-rendered wherever appropriate.
   */
  useCurrentUserUpdatedSubscription();
  return null;
}

function RedirectToLogin() {
  // XXX: useFullHref is using useSearchParams, useSearchParams requires Suspense around components that use it
  const fullHref = useFullHref();
  return <Redirect href={`/login?next=${encodeURIComponent(fullHref)}`} />
}

function LinkToLogin() {
  const fullHref = useFullHref();
  return <Link
    href={`/login?next=${encodeURIComponent(fullHref)}`}
    data-cy="header-login-button"
  >
    Sign in
  </Link>
}

export function SharedLayout({
  title,
  titleHref,
  titleHrefAs,
  noPad = false,
  noHandleErrors = false,
  query,
  forbidWhen = AuthRestrict.NEVER,
  children,
}: SharedLayoutProps) {
  const router = useRouter();
  const client = useApolloClient();
  const [logout] = useLogoutMutation();

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      await client.resetStore();
      // Navigate to home page
      router.push("/");

      // In App Router, there's no built-in event for route change completion
      // If you need to perform actions after navigation, you can use a timeout
      // or implement your own navigation complete detection
    } catch (e) {
      console.error("Logout failed:", e);
      // Force logout by redirecting to logout page
      window.location.href = "/logout";
    }
  }, [router, client, logout]);

  const forbidsLoggedIn = forbidWhen & AuthRestrict.LOGGED_IN;
  const forbidsLoggedOut = forbidWhen & AuthRestrict.LOGGED_OUT;
  const forbidsNotAdmin = forbidWhen & AuthRestrict.NOT_ADMIN;
  const renderChildren = (props: SharedLayoutChildProps) => {
    const inner =
      props.error && !props.loading && !noHandleErrors ? (
        <>
          {process.env.NODE_ENV === "development" ? (
            <ErrorAlert error={props.error} />
          ) : null}
        </>
      ) : typeof children === "function" ? (
        children(props)
      ) : (
        children
      );
    if (
      data &&
      data.currentUser &&
      (forbidsLoggedIn || (forbidsNotAdmin && !data.currentUser.isAdmin))
    ) {
      return (
        <StandardWidth>
          <Redirect href={"/"} />
        </StandardWidth>
      );
    } else if (
      data &&
      data.currentUser === null &&
      !loading &&
      !error &&
      forbidsLoggedOut
    ) {
      return <React.Suspense><RedirectToLogin /></React.Suspense>;
    }

    return noPad ? inner : <StandardWidth>{inner}</StandardWidth>;
  };
  const { data, loading, error } = query;

  return (
    <Layout>
      {data && data.currentUser ? <CurrentUserUpdatedSubscription /> : null}
      <Header
        style={{
          boxShadow: "0 2px 8px #f0f1f2",
          zIndex: 1,
          overflow: "hidden",
        }}
      >
        <Head>
          <title>{title ? `${title} — ${projectName}` : projectName}</title>
        </Head>
        <Row justify="space-between">
          <Col span={6}>
            <Link href="/">{projectName}</Link>
          </Col>
          <Col span={12}>
            <H3
              style={{
                margin: 0,
                padding: 0,
                textAlign: "center",
                lineHeight: "64px",
              }}
            >
              {titleHref ? (
                <Link
                  href={titleHref}
                  as={titleHrefAs}
                  data-cy="layout-header-titlelink"
                >
                  {title}
                </Link>
              ) : (
                title
              )}
            </H3>
          </Col>
          <Col span={6} style={{ textAlign: "right" }}>
            {data && data.currentUser ? (
              <Dropdown
                overlay={
                  <Menu>
                    {data.currentUser.organizationMemberships.nodes.map(
                      ({ organization, isOwner }) => (
                        <Menu.Item key={organization?.id}>
                          <Link
                            href={`/o/[slug]`}
                            as={`/o/${organization?.slug}`}
                          >
                            {organization?.name}
                            {isOwner ? (
                              <span>
                                {" "}
                                <CrownOutlined />
                              </span>
                            ) : (
                              ""
                            )}
                          </Link>
                        </Menu.Item>
                      )
                    )}
                    <Menu.Item key="_create-organization">
                      <Link
                        href="/create-organization"
                        data-cy="layout-link-create-organization"
                      >
                        Create organization
                      </Link>
                    </Menu.Item>
                    <Menu.Item key="_settings">
                      <Link href="/settings" data-cy="layout-link-settings">
                        <Warn okay={data.currentUser.isVerified}>Settings</Warn>
                      </Link>
                    </Menu.Item>
                    <Menu.Item key="_logout">
                      <a onClick={handleLogout}>Logout</a>
                    </Menu.Item>
                  </Menu>
                }
              >
                <span
                  data-cy="layout-dropdown-user"
                  style={{ whiteSpace: "nowrap" }}
                >
                  <Avatar>
                    {(data.currentUser.name && data.currentUser.name[0]) || "?"}
                  </Avatar>
                  <Warn
                    okay={data.currentUser.isVerified}
                    data-cy="header-unverified-warning"
                  >
                    <span style={{ marginLeft: 8, marginRight: 8 }}>
                      {data.currentUser.name}
                    </span>
                    <DownOutlined />
                  </Warn>
                </span>
              </Dropdown>
            ) : forbidsLoggedIn ? null : (
              <React.Suspense><LinkToLogin/></React.Suspense>
            )}
          </Col>
        </Row>
      </Header>
      <Content style={{ minHeight: contentMinHeight }}>
        {renderChildren({
          error,
          loading,
          currentUser: data && data.currentUser,
        })}
      </Content>
      <Footer>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <Text>
            Copyright &copy; {new Date().getFullYear()} {companyName}. All
            rights reserved.
            {process.env.T_AND_C_URL ? (
              <span>
                {" "}
                <a
                  style={{ textDecoration: "underline" }}
                  href={process.env.T_AND_C_URL}
                >
                  Terms and conditions
                </a>
              </span>
            ) : null}
          </Text>
          <Text>
            Powered by{" "}
            <a
              style={{ textDecoration: "underline" }}
              href="https://graphile.org/postgraphile"
            >
              PostGraphile
            </a>
          </Text>
        </div>
      </Footer>
    </Layout>
  );
}
