import React, {Component} from 'react' 


import { 
    Layout,
    Button,
    Icon,
    Modal,
    Form,
    Input,
    Checkbox,
    Row,
    message,
    Tooltip,
    Drawer,
    Popconfirm
} from 'antd';
import './room.less';


import emedia from 'easemob-emedia';
import login from './login.js'

// assets
const requireContext = require.context('../../assets/images', true, /^\.\/.*\.png$/)// 通过webpack 获取 img
const get_img_url_by_name = (name) => {
    if(!name){
        return
    }
    let id = requireContext.resolve(`./${name}.png`);

    return __webpack_require__(id);
}


const Item = Form.Item 

const { Header, Content, Footer } = Layout;

class RoomHeader extends Component {

    render() {
        let { roomName, stream_list } = this.props;
        let admin = '';
        stream_list.map(item => {
            
            if(
                item &&
                item.member && 
                item.member.role == 7
            ) {
                admin = item.member.name.slice(-5);
                return
            }
        })

        return (
            <Header>
                <div className="info">
                    <div>
                        <img src={get_img_url_by_name('logo-text-room')}/>
                    </div>
                    <div style={{lineHeight:1}}>
                        <div>
                            <Tooltip title={'主持人: ' + (admin || 'sqx')} placement="bottom">
                                <img src={get_img_url_by_name('admin-icon')} style={{marginTop:'-5px'}}/>
                            </Tooltip>
                            {/* <span>network</span> */}
                            <span className="name">{roomName || '房间名称'}</span>
                        </div>
                    </div>

                    <div onClick={() => this.leave()} style={{cursor: 'pointer',color:'#EF413F'}}>
                        <img src={get_img_url_by_name('leave-icon')} />
                        <span>离开房间</span>
                    </div>
                </div>
            </Header>

        )
    }
}

class TalkerList extends Component {

    state = {
        show:false
    }
    componentDidMount() {
        this.streamBindVideo()
    }
    componentDidUpdate() {
        this.streamBindVideo()
    }
    toggle = () => {
        let { show } = this.state;
        this.setState({
            show:!show
        })
    }
    streamBindVideo = () => {
        
        let { stream_list } = this.props;

        let _this = this;
        stream_list.map(item => {
            if( item ){

                let { id } = item.stream;
                let el = _this.refs[`list-video-${id}`];
    
                let { stream, member } = item;
                if( stream.located() ){
                    emedia.mgr.streamBindVideo(stream, el);
                }else {
                    emedia.mgr.subscribe(member, stream, true, true, el)
                }
            }
        });
    }
    render() {

        let _this = this;
        let { stream_list } = this.props;
        let { show } = this.state
        function get_talkers() {
            let talkers = 0;
            let { stream_list } = _this.props;
            stream_list.map(item => {
                if(
                    item &&
                    item.stream &&
                    item.stream.type != emedia.StreamType.DESKTOP
                ){ //null 的不计数 共享桌面不计数
                    talkers++
                }
            })
            return talkers
        }
    
        return (
            <Drawer 
                title={`主播${get_talkers()} 观众0`}
                placement="right"
                closable={false}
                visible={show}
                mask={false}
                getContainer={false}
                width="336px"
            >
                <img 
                    src={get_img_url_by_name('expand-icon')} 
                    className={'toggle-icon ' + (show ? 'expand' : 'collapse')}
                    onClick={this.toggle}
                 />
                { stream_list.map((item) => {
                    if( item ){
                        let { id } = item.stream
                        return (
                            <div 
                                key={id} 
                                className="item"
                            >
                                <video ref={`list-video-${id}`} autoPlay></video>
                            </div>
                        )
                    }
                }) }
            </Drawer>
        )
    }
}


class Room extends Component {
    constructor(props) {
        super(props);

        this.state = {

            // join start
            roomName:'',
            password:'',
            nickName:'',
            joined: false,
            loading: false,
            // join end

            user: {},
            user_room: {
                role: undefined
            },
            stream_list: [],
            audio:true,
            video:true,

            talker_is_full:false, //主播已满
        };

    }

    // join fun start
    async join() {

        this.setState({ loading:true })
        let {
            roomName,
            password,
            nickName
        } = this.state;

        let { role } = this.state.user_room;
        let {
            username,
            token
        } = this.state.user;
        
        let params = {
            roomName,
            password,
            role,
            memName: 'easemob-demo#chatdemoui_' + username, // appkey + username 格式（后台必须）
            token,
            config:{ nickName }
        }

        try {
            const user_room = await emedia.mgr.joinRoom(params);
    
            let _this = this;
            this.setState({ 
                joined: true,
                user_room
            },() => {
                _this.publish();
            })
    
            // this.startTime()
            
        } catch (error) { 
            if(error.error == -200){//主播人数已满
                this.setState({ talker_is_full: true })
            }
        }
    }
    join_handle(role){
        var _this = this;
        let { user_room } = this.state;
        user_room.role = role;
        this.props.form.validateFields((err, values) => {
            _this.setState({
                roomName: values.roomName,
                password: values.password,
                nickName: values.nickName,
                user_room
            },() => {
                if (!err) {
                    _this.join()
                }
            })
        });
    }
    // join fun end

    async componentDidMount () {

        const user = await login();
        this.setState({ user })
        this.init_emedia_callback();
        window.onbeforeunload=function(e){     
            var e = window.event||e;  
            emedia.mgr.exitConference();
        } 
    }

    componentWillUnmount() {
        clearInterval(this.timeID);
    }
    init_emedia_callback() {
        let _this = this;
        
        emedia.config({
            restPrefix: process.env.REACT_APP_HOST
        });
        emedia.mgr.onStreamAdded = function (member, stream) {
            console.log('onStreamAdded >>>', member, stream);

            _this._on_stream_added(member, stream)
        };
        emedia.mgr.onStreamRemoved = function (member, stream) {
            console.log('onStreamRemoved',member,stream);

            _this._on_stream_removed(stream)
        };
        emedia.mgr.onMemberJoined = function (member) {
            console.log('onMemberJoined',member);
            message.success(`${member.nickName || member.name} 加入了会议`);
        };

        emedia.mgr.onMemberLeave = function (member, reason, failed) {
            console.log('onMemberLeave', member, reason, failed);
            message.success(`${member.nickName || member.name} 退出了会议`);
        };

    }

    leave() {

        let is_confirm = window.confirm('确定退出会议吗？');

        if(is_confirm){
            emedia.mgr.exitConference();
            window.location.reload()
        }
        
    }
    publish() {
        let { role } = this.state.user_room
        if(role == 1){//观众不推流
            return
        }
        let { audio,video } = this.state //push 流取off(关) 的反值
        emedia.mgr.publish({ audio, video });
    }
    
    _on_stream_added(member, stream) {
        if(!member || !stream) {
            return
        }

        let { stream_list } = this.state

        if(stream.located()) {//自己 publish的流，添加role 属性
            let { role } = this.state.user_room;
            member.role = role;
        }
        stream_list.push({ stream, member })

        this.setState({ stream_list })
    } 
    _on_stream_removed(stream) {
        if(!stream){
            return
        }

        let { stream_list } = this.state

        stream_list.map((item, index) => {
            if(
                item &&
                item.stream && 
                item.stream.id == stream.id 
            ) {
                stream_list.splice(index, 1)
            }
        });

        this.setState({ stream_list })
    }
    
    render() {

        const { getFieldDecorator } = this.props.form;

        let { joined } = this.state;
        return (
            <div style={{width:'100%', height:'100%'}}>
                {/* join compoent */}
                <div className="login-wrap" style={{display: joined ? 'none' : 'flex'}}>
                    <div className="header">
                        <img src={get_img_url_by_name('logo-text-login')} />
                    </div>
                    <Form className="login-form">
                        <img src={get_img_url_by_name('logo')} />
                        <div style={{margin:'17px 0 45px'}}>欢迎使用环信多人会议</div>
                        <Item>
                            {getFieldDecorator('roomName', {
                                initialValue: 'room-8',
                                rules: [
                                    { required: true, message: '请输入房间名称' },
                                    { min:3 , message: '房间名称不能少于3位'}
                                ],
                            })(
                                <Input
                                prefix={<Icon type="home" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                placeholder="房间名称"
                                />
                            )}
                        </Item>
                        <Item>
                        {getFieldDecorator('password', {
                            initialValue: '123',
                            rules: [
                                { required: true, message: '请输入房间密码' },
                                { min:3 , message: '密码长度不能小于3位'}
                            ],
                        })(
                            <Input
                            prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />}
                            type="password"
                            placeholder="房间密码"
                            />
                        )}
                        </Item>
                        <Item>
                        {getFieldDecorator('nickName')(
                            <Input
                                prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />}
                                type="text"
                                placeholder="加入会议的昵称"
                            />
                        )}
                        </Item>

                        {/* <div>会议设置</div> */}
                        
                        <Row 
                            type="flex"
                            justify="space-between"
                            style={{margin: '-8px 0px 30px'}}>
                            <Checkbox
                                checked={this.state.video}
                                onChange={this.video_change}
                            >入会开启摄像头</Checkbox>
                        </Row>

                        <div className="action">
                            <Button 
                                type="primary"  
                                onClick={() => this.join_handle(3)}
                                loading={this.state.loading}
                            >
                                以主播身份进入
                            </Button>
                            <Button 
                                type="primary"  
                                onClick={() => this.join_handle(1)}
                                loading={this.state.loading}
                            >
                                以观众身份进入
                            </Button>
                        </div>

                        
                    </Form>
                
                    {/* 主播人数已满提醒框 */}
                    <Modal
                        visible={this.state.talker_is_full}
                        closable={false}
                        onOk={this.close_talker_model}
                        onCancel={this.close_talker_model}
                        okText="以观众身份登录"
                        cancelText="暂不登录"
                        centered={true}
                        mask={false}
                        maskClosable={false}
                        width='470px'

                    >
                        <div>
                            <img src={get_img_url_by_name('warning-icon')}/>
                        </div>
                        <div>主播人数已满<br></br>是否以观众身份进入？</div>
                    </Modal>
                </div>
                
                {/* room compoent */}
                <Layout className="meeting" style={{display: joined ? 'block' : 'none'}}>
                    <RoomHeader {...this.state}/>
                    <TalkerList {...this.state}/>
                </Layout>
            </div>
        )
    }
}
const WrapRoom = Form.create()(Room)
export default WrapRoom