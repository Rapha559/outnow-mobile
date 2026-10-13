import Constants from 'expo-constants';
import { ReactNode, Component, ErrorInfo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { API_BASE } from '@/lib/api';

type Props={children:ReactNode};
type State={error:Error|null};

export class AppErrorBoundary extends Component<Props,State>{
  state:State={error:null};

  static getDerivedStateFromError(error:Error):State{return{error};}

  componentDidCatch(error:Error,info:ErrorInfo){
    void fetch(`${API_BASE}/api/mobile/telemetry/error`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({
        message:error.message,
        stack:`${error.stack||''}\n${info.componentStack||''}`,
        platform:Platform.OS,
        appVersion:Constants.expoConfig?.version||null,
      }),
    }).catch(()=>undefined);
  }

  render(){
    if(!this.state.error)return this.props.children;
    return <View style={styles.screen}><View style={styles.mark}><Text style={styles.markText}>!</Text></View><Text style={styles.title}>OutNow hit a problem</Text><Text style={styles.copy}>The error was reported. You can retry this screen without signing out.</Text><Pressable style={styles.button} onPress={()=>this.setState({error:null})}><Text style={styles.buttonText}>Try again</Text></Pressable></View>;
  }
}

const styles=StyleSheet.create({screen:{flex:1,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',padding:28},mark:{width:58,height:58,borderRadius:29,backgroundColor:'#f3efff',alignItems:'center',justifyContent:'center'},markText:{color:'#7c3aed',fontSize:30,fontWeight:'900'},title:{color:'#111827',fontSize:25,fontWeight:'900',marginTop:18,textAlign:'center'},copy:{color:'#6b7280',fontSize:14,lineHeight:21,textAlign:'center',marginTop:9,maxWidth:340},button:{minWidth:160,height:50,borderRadius:15,backgroundColor:'#7c3aed',alignItems:'center',justifyContent:'center',marginTop:22},buttonText:{color:'#fff',fontWeight:'900'}});
