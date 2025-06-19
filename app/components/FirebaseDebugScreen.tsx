import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Animated,
} from 'react-native';
import {
  getFirebaseRequestCount,
  getFirebaseRequestLog,
  resetFirebaseRequestCount,
  printFirebaseRequestSummary,
} from '../../utils/firestore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FirebaseDebugScreen = () => {
  const [requestCount, setRequestCount] = useState(0);
  const [requestLog, setRequestLog] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const position = new Animated.ValueXY({ x: SCREEN_WIDTH - 120, y: 100 });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({
        x: Math.max(0, Math.min(SCREEN_WIDTH - 120, position.x._value + gesture.dx)),
        y: Math.max(0, Math.min(SCREEN_HEIGHT - 200, position.y._value + gesture.dy)),
      });
    },
  });

  const updateStats = () => {
    setRequestCount(getFirebaseRequestCount());
    setRequestLog(getFirebaseRequestLog());
  };

  useEffect(() => {
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    resetFirebaseRequestCount();
    updateStats();
  };

  const handlePrintSummary = () => {
    printFirebaseRequestSummary();
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: position.getTranslateTransform(),
          height: isExpanded ? 500 : 40,
        },
      ]}
      // {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <Text style={styles.title}>
          🔥 {requestCount} req
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={handleReset}>
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handlePrintSummary}>
              <Text style={styles.buttonText}>Print</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.logContainer}>
            {requestLog.map((log, index) => (
              <View key={index} style={styles.logEntry}>
                <Text style={styles.timestamp}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.operation}>{log.operation}</Text>
                <Text style={styles.path}>{log.path}</Text>
                {log.data && (
                  <Text style={styles.data}>
                    Data: {JSON.stringify(log.data, null, 2)}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 4,
    minWidth: 50,
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    position: 'absolute',
    width: 120,
    zIndex: 9999,
  },
  content: {
    flex: 1,
    padding: 8,
  
  },
  data: {
    color: '#ccc',
    fontFamily: 'monospace',
    fontSize: 10,
  },
  header: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    height: 40,
    justifyContent: 'center',
  },
  logContainer: {
    flex: 1,
  },
  logEntry: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 4,
    padding: 4,
  },
  operation: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  path: {
    color: '#fff',
    fontSize: 10,
    marginBottom: 2,
  },
  timestamp: {
    color: '#999',
    fontSize: 10,
    marginBottom: 2,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 