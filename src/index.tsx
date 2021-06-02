import React from 'react';
import {PluginClient, usePlugin, createState, useValue} from 'flipper-plugin';
import { Button, Tree, PageHeader, Radio, Space, Empty, Layout} from 'antd';
import {
  CheckCircleTwoTone,
  // <StopOutlined />
  ExclamationCircleTwoTone,
  StopTwoTone
} from '@ant-design/icons';
import { DataNode } from 'rc-tree/lib/interface';
// @ts-ignore
import electron from 'electron';

type Events = {};

interface JsModule {
  verboseName: string;
  children: JsModule[];
  offset: number;
  duration: number;
  isBase: boolean;
}

interface PrintOption {
  initId?: number;
  depth?: number;
  minDuratin?: number;
}

type Methods = {
  getTree: (option: PrintOption) => Promise<JsModule>;
  setMinDuration: (min: number) => never;
}

export function plugin(client: PluginClient<Events, Methods>) {
  // 当前树形结构数据
  const tree = createState<JsModule | null>(null, {persist: 'tree'});
  // 最小时间筛选
  const minDuration = createState<number>(5, {persist: 'minDuration'});
  // index模块id，开发环境为0，生产为200000，但是目前不上生产
  const initId = createState<number>(0, {persist: 'initId'});

  client.onConnect(() => {
    console.info('onConnect: launch performance tree');
    setTimeout(() => {
      refreshTree();
    }, 1000);
  });

  // 获取数据
  async function refreshTree() {
    const res = await client.send('getTree', {
      minDuratin: minDuration.get(),
      initId: initId.get()
    });
    tree.set(res);
  }

  // 打开文档

  return {tree, minDuration, initId, refreshTree};
}

function _getTreeData(data: JsModule): DataNode {

  let icon = <CheckCircleTwoTone twoToneColor="#52c41a" />;
  if (data.duration < 5) {
    icon = <CheckCircleTwoTone twoToneColor="#52c41a" />;
  } else if (data.duration >= 5 && data.duration < 20) {
    icon = <ExclamationCircleTwoTone twoToneColor="#1890ff" />;
  } else {
    icon = <ExclamationCircleTwoTone twoToneColor="#f81d22" />;
  } 

  if (data.isBase) {
    icon = <StopTwoTone twoToneColor="gray" />;
  }

  let children: DataNode[] = []; 

  // baseBundle
  if (!data.isBase) {
    children = data.children.map((module) => { return _getTreeData(module); });
  }
  
  return {
    title: `${data.duration}ms - ${data.verboseName}`,
    key: data.verboseName,
    icon: icon,
    children: children
  }
}

export function Component() {
  const instance = usePlugin(plugin);
  const tree = useValue(instance.tree);
  const minDuration = useValue(instance.minDuration);

  // 整理树形数据
  let treeData = null;
  if (tree !== null) {
    treeData = _getTreeData(tree);
  }

  return (
    <Layout style={{backgroundColor: 'white'}}>
      <Layout.Header style={{backgroundColor: 'transparent', padding: '0 0'}}>
        <PageHeader title={'Launch Performance Tree'} extra={[
          <Button key={4} type="primary" title={'解惑'}
            onClick={() => {
              electron.shell.openExternal("https://github.com/SBDavid/flipper-plugin-launchperformancetree-client");
            }}
          >{'解惑'}</Button>,
          <Space key={3}> </Space>,
          <Radio.Group
            key={0}
            options={[
              { label: '所有', value: 0 },
              { label: '大于5ms', value: 5 },
              { label: '大于10ms', value: 10 },
              { label: '大于20ms', value: 20 },
            ]}
            value={minDuration}
            optionType="button"
            buttonStyle="solid"
            onChange={(val) => {
              instance.minDuration.set(val.target.value);
              instance.refreshTree();
            }}
          />,
          <Space key={1}></Space>,
          <Button key={2} type="primary" title={'刷新'}
            onClick={() => {
              instance.refreshTree();
            }}
          >{'刷新'}</Button>,
        ]}></PageHeader>
      </Layout.Header>
      <Layout.Content>
        {treeData === null ? <Empty /> : 
        <div style={{overflow: 'scroll', height: '100%'}}>
          <Tree
            showLine
            virtual
            showIcon
            treeData={[treeData]}
          ></Tree>
        </div>}
      </Layout.Content>
    </Layout>
  );
}
