"use client";
import { LockOutlined, UserAddOutlined, UserOutlined } from "@ant-design/icons";
import { ApolloError, useApolloClient } from "@apollo/client";
import {
  AuthRestrict,
  ButtonLink,
  Col,
  Redirect,
  Row,
  SharedLayout,
  SharedLayoutChildProps,
  SocialLoginOptions,
} from "@/appcomponents";
import { useLoginMutation, useSharedQuery } from "@/appgraphqlgenerated";
import {
  extractError,
  getCodeFromError,
  // resetWebsocketConnection,
} from "@/applib";
import type { InputRef } from "antd";
import { Alert, Button, Form, Input } from "antd";
import { useForm } from "antd/lib/form/Form";
import { NextPage } from "next";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Store } from "rc-field-form/lib/interface";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { isSafe } from "./lib";

interface LoginProps {
  next: string | null;
}

function InvitationAcceptPage() {
  const searchParams = useSearchParams();
  return <Login next={searchParams.get("next")} />;
}

export default function InvitationAcceptPageWrapper() {
  return (
    <Suspense>
      <InvitationAcceptPage />
    </Suspense>
  );
}

/**
 * Login page just renders the standard layout and embeds the login form
 */
const Login: NextPage<LoginProps> = ({ next: rawNext }) => {
  const [error, setError] = useState<Error | ApolloError | null>(null);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const next: string = isSafe(rawNext) ? rawNext! : "/";
  const query = useSharedQuery();
  return (
    <SharedLayout
      title="Sign in"
      query={query}
      forbidWhen={AuthRestrict.LOGGED_IN}
    >
      {({ currentUser }: SharedLayoutChildProps) =>
        currentUser ? (
          <Redirect href={next} />
        ) : (
          <Row justify="center" style={{ marginTop: 32 }}>
            {showLogin ? (
              <Col xs={24} sm={12}>
                <Row>
                  <LoginForm
                    onSuccessRedirectTo={next}
                    onCancel={() => setShowLogin(false)}
                    error={error}
                    setError={setError}
                  />
                </Row>
              </Col>
            ) : (
              <Col xs={24} sm={12}>
                <Row style={{ marginBottom: 8 }}>
                  <Col span={24}>
                    <Button
                      data-cy="loginpage-button-withusername"
                      icon={<UserOutlined />}
                      size="large"
                      block
                      onClick={() => setShowLogin(true)}
                      type="primary"
                    >
                      Sign in with E-mail or Username
                    </Button>
                  </Col>
                </Row>
                <Row style={{ marginBottom: 8 }}>
                  <Col span={24}>
                    <SocialLoginOptions next={next} />
                  </Col>
                </Row>
                <Row justify="center">
                  <Col flex={1}>
                    <ButtonLink
                      icon={<UserAddOutlined />}
                      size="large"
                      block
                      type="default"
                      data-cy="loginpage-button-register"
                      href={`/register?next=${encodeURIComponent(next)}`}
                    >
                      Create an account
                    </ButtonLink>
                  </Col>
                </Row>
              </Col>
            )}
          </Row>
        )
      }
    </SharedLayout>
  );
};

interface LoginFormProps {
  onSuccessRedirectTo: string;
  error: Error | ApolloError | null;
  setError: (error: Error | ApolloError | null) => void;
  onCancel: () => void;
}

function LoginForm({
  onSuccessRedirectTo,
  onCancel,
  error,
  setError,
}: LoginFormProps) {
  const [form] = useForm();
  const [login] = useLoginMutation({});
  const client = useApolloClient();
  const router = useRouter();

  const [submitDisabled, setSubmitDisabled] = useState(false);
  const handleSubmit = useCallback(
    async (values: Store) => {
      setError(null);
      try {
        await login({
          variables: {
            username: values.username,
            password: values.password,
          },
        });
        // Success: refetch
        // resetWebsocketConnection();
        client.resetStore();
        router.push(onSuccessRedirectTo);
      } catch (e: any) {
        const code = getCodeFromError(e);
        if (code === "CREDS") {
          form.setFields([
            {
              name: "password",
              value: form.getFieldValue("password"),
              errors: ["Incorrect username or passphrase"],
            },
          ]);
          setSubmitDisabled(true);
        } else {
          setError(e);
        }
      }
    },
    [router, client, form, login, onSuccessRedirectTo, setError]
  );

  const focusElement = useRef<InputRef>(null);
  useEffect(
    () => void (focusElement.current && focusElement.current!.focus()),
    [focusElement]
  );

  const handleValuesChange = useCallback(() => {
    setTimeout(() => {
      setSubmitDisabled(
        form.getFieldsError().some((fieldError) => fieldError.errors.length > 0)
      );
    }, 0);
  }, [form]);

  const code = getCodeFromError(error);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      onValuesChange={handleValuesChange}
      style={{ width: "100%" }}
    >
      <Form.Item
        name="username"
        rules={[{ required: true, message: "Please input your username" }]}
      >
        <Input
          size="large"
          prefix={<UserOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
          placeholder="E-mail or Username"
          autoComplete="email username"
          ref={focusElement}
          data-cy="loginpage-input-username"
        />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[{ required: true, message: "Please input your passphrase" }]}
      >
        <Input
          prefix={<LockOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
          size="large"
          type="password"
          placeholder="Passphrase"
          autoComplete="current-password"
          data-cy="loginpage-input-password"
        />
      </Form.Item>
      <Form.Item>
        <Link href="/forgot">Forgotten passphrase?</Link>
      </Form.Item>

      {error ? (
        <Form.Item>
          <Alert
            type="error"
            message={`Sign in failed`}
            description={
              <span>
                {extractError(error).message}
                {code ? (
                  <span>
                    {" "}
                    (Error code: <code>ERR_{code}</code>)
                  </span>
                ) : null}
              </span>
            }
          />
        </Form.Item>
      ) : null}
      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          disabled={submitDisabled}
          data-cy="loginpage-button-submit"
        >
          Sign in
        </Button>
        <a style={{ marginLeft: 16 }} onClick={onCancel}>
          Use a different sign in method
        </a>
      </Form.Item>
    </Form>
  );
}
