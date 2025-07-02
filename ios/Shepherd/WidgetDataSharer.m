#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetDataSharer, NSObject)

RCT_EXTERN_METHOD(updateVerseData:(NSString *)bibleReference withVerse:(NSString *)verse withImageURL:(NSString *)imageURL)
RCT_EXTERN_METHOD(updateWidgetStatus:(NSString *)status)
RCT_EXTERN_METHOD(updateTimeline:(NSArray *)entries)

@end 